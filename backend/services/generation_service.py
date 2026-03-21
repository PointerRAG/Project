import logging
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import T5ForConditionalGeneration, T5Config, AutoTokenizer
from typing import Optional, Dict
from dataclasses import dataclass
from safetensors.torch import load_file
import os

logger = logging.getLogger(__name__)

@dataclass
class PointerGeneratorConfig:
    base_model_name: str = "t5-base"
    gate_hidden_size: int = 512
    max_input_length: int = 512
    max_target_length: int = 64
    copy_loss_weight: float = 0.0

class PointerGeneratorGate(nn.Module):
    def __init__(self, d_model: int, d_embed: int, hidden_size: int):
        super().__init__()
        gate_input_size = d_model + d_model + d_embed

        self.gate_network = nn.Sequential(
            nn.Linear(gate_input_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(hidden_size, 1),
            nn.Sigmoid()
        )

    def forward(
        self,
        decoder_hidden: torch.Tensor,
        context_vector: torch.Tensor,
        token_embedding: torch.Tensor,
    ) -> torch.Tensor:
        gate_input = torch.cat([decoder_hidden, context_vector, token_embedding], dim=-1)
        p_gen = self.gate_network(gate_input)
        return p_gen

class T5PointerGeneratorNetwork(nn.Module):
    def __init__(self, pg_config: PointerGeneratorConfig):
        super().__init__()
        self.pg_config = pg_config
        self.t5 = T5ForConditionalGeneration.from_pretrained(pg_config.base_model_name)
        self.t5_config: T5Config = self.t5.config

        d_model = self.t5_config.d_model
        d_embed = self.t5_config.d_model
        vocab_size = self.t5_config.vocab_size

        self.vocab_size = vocab_size

        self.gate = PointerGeneratorGate(
            d_model=d_model,
            d_embed=d_embed,
            hidden_size=pg_config.gate_hidden_size,
        )

    def _compute_copy_distribution(
        self,
        cross_attention_weights: torch.Tensor,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        batch_size: int,
        tgt_len: int,
    ) -> torch.Tensor:
        copy_attn = cross_attention_weights.float().mean(dim=1)
        pad_mask = attention_mask.unsqueeze(1).float()
        copy_attn = copy_attn * pad_mask
        copy_attn = copy_attn / copy_attn.sum(dim=-1, keepdim=True).clamp(min=1e-9)

        src_len = input_ids.size(1)

        copy_dist = torch.zeros(
            batch_size, tgt_len, self.vocab_size,
            device=cross_attention_weights.device,
            dtype=torch.float32,
        )

        expanded_input_ids = input_ids.unsqueeze(1).expand(batch_size, tgt_len, src_len)
        copy_dist.scatter_add_(2, expanded_input_ids, copy_attn)

        return copy_dist

    def _blend_distributions(
        self,
        vocab_logits: torch.Tensor,
        copy_dist: torch.Tensor,
        p_gen: torch.Tensor,
    ) -> torch.Tensor:
        vocab_prob = F.softmax(vocab_logits.float(), dim=-1)
        final_dist = p_gen * vocab_prob + (1.0 - p_gen) * copy_dist
        final_dist = final_dist.clamp(min=1e-9)
        return torch.log(final_dist)

    def forward(
        self,
        input_ids: torch.Tensor,
        attention_mask: torch.Tensor,
        labels: Optional[torch.Tensor] = None,
        decoder_input_ids: Optional[torch.Tensor] = None,
        decoder_attention_mask: Optional[torch.Tensor] = None,
    ) -> Dict[str, torch.Tensor]:
        batch_size = input_ids.size(0)

        if decoder_input_ids is None and labels is not None:
            shifted_labels = labels.clone()
            shifted_labels[shifted_labels == -100] = self.t5.config.pad_token_id
            decoder_input_ids = self.t5._shift_right(shifted_labels)

        t5_outputs = self.t5(
            input_ids=input_ids,
            attention_mask=attention_mask,
            decoder_input_ids=decoder_input_ids,
            decoder_attention_mask=decoder_attention_mask,
            output_attentions=True,
            output_hidden_states=True,
            return_dict=True,
        )

        decoder_hidden = t5_outputs.decoder_hidden_states[-1]
        tgt_len = decoder_hidden.size(1)

        last_cross_attn = t5_outputs.cross_attentions[-1]
        avg_cross_attn = last_cross_attn.mean(dim=1)

        encoder_hidden = t5_outputs.encoder_last_hidden_state
        context_vector = torch.bmm(avg_cross_attn, encoder_hidden)

        token_embedding = self.t5.shared(decoder_input_ids)

        p_gen = self.gate(
            decoder_hidden=decoder_hidden,
            context_vector=context_vector,
            token_embedding=token_embedding,
        )

        vocab_logits = t5_outputs.logits

        copy_dist = self._compute_copy_distribution(
            cross_attention_weights=last_cross_attn,
            input_ids=input_ids,
            attention_mask=attention_mask,
            batch_size=batch_size,
            tgt_len=tgt_len,
        )

        blended_log_probs = self._blend_distributions(
            vocab_logits=vocab_logits,
            copy_dist=copy_dist,
            p_gen=p_gen,
        )

        return {
            "loss": None,
            "logits": blended_log_probs,
            "p_gen": p_gen,
        }

class GenerationService:
    def __init__(self):
        self._model = None
        self._tokenizer = None
        self._device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._config = PointerGeneratorConfig()

    def load_model(self):
        logger.info("Loading Pointer-Generator local model...")
        checkpoint_path = "./checkpoint-8142"

        self._tokenizer = AutoTokenizer.from_pretrained("t5-base")
        self._model = T5PointerGeneratorNetwork(self._config)

        try:
            state_dict = load_file(os.path.join(checkpoint_path, "model.safetensors"))
            new_state_dict = {}
            for k, v in state_dict.items():
                if k.startswith("encoder.") or k.startswith("decoder.") or k.startswith("shared.") or k.startswith("lm_head"):
                    new_state_dict["t5." + k] = v
                else:
                    new_state_dict[k] = v

            self._model.load_state_dict(new_state_dict, strict=False)
            self._model.to(self._device)
            self._model.eval()
            logger.info("Pointer-Generator model loaded successfully on " + str(self._device))
        except Exception as e:
            logger.error(f"Failed to load model from checkpoint: {e}")
            raise e

    def generate_answer(self, question: str, context: str) -> str:
        if not self._model or not self._tokenizer:
            logger.warning("Model not loaded. Attempting to load now.")
            self.load_model()
            
        input_text = f"question: {question} context: {context}"

        inputs = self._tokenizer(
            input_text,
            return_tensors="pt",
            truncation=True,
            max_length=self._config.max_input_length
        ).to(self._device)

        input_ids = inputs["input_ids"]
        attention_mask = inputs["attention_mask"]

        decoder_input_ids = torch.tensor([[self._tokenizer.pad_token_id]], device=self._device)
        generated_tokens = []

        with torch.no_grad():
            for _ in range(self._config.max_target_length):
                outputs = self._model(
                    input_ids=input_ids,
                    attention_mask=attention_mask,
                    decoder_input_ids=decoder_input_ids
                )

                final_dist = torch.exp(outputs["logits"][:, -1, :])
                next_token = torch.argmax(final_dist, dim=-1)
                token_id = next_token.item()

                if token_id == self._tokenizer.eos_token_id:
                    break

                generated_tokens.append(token_id)

                decoder_input_ids = torch.cat(
                    [decoder_input_ids, next_token.unsqueeze(0)],
                    dim=-1
                )

        answer = self._tokenizer.decode(generated_tokens, skip_special_tokens=True)
        return answer

_generation_service: Optional[GenerationService] = None

def get_generation_service() -> GenerationService:
    global _generation_service
    if _generation_service is None:
        _generation_service = GenerationService()
        _generation_service.load_model()
    return _generation_service
