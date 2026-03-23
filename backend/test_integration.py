import time
from backend.services.generation_service import get_generation_service

def main():
    print("Initializing Generation Service (Loading models...)\n")
    start = time.time()
    service = get_generation_service()
    print(f"Service loaded in {time.time() - start:.2f}s\n")

    question = "what is the model?"
    context = "the deepmultilingualpunctuation is a model that restores punctuation"
    
    print(f"Generating answer for:\nQuestion: {question}\nContext: {context}\n")
    start_gen = time.time()
    answer = service.generate_answer(question, context)
    print(f"Generated Answer: {answer}")
    print(f"Generation time: {time.time() - start_gen:.2f}s\n")

if __name__ == "__main__":
    main()
