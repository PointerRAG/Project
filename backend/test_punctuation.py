import time
from deepmultilingualpunctuation import PunctuationModel
import sys

def main():
    text = "this is a test sentence without punctuation we want to see how the model performs and what the latency is deepmultilingualpunctuation is a hugging face model that i am told will solve some of issues"
    
    print("Loading model...")
    start_load = time.time()
    try:
        model = PunctuationModel()
    except Exception as e:
        print(f"Error loading model: {e}")
        sys.exit(1)
    load_time = time.time() - start_load
    print(f"Model load time: {load_time:.2f}s\n")

    print("Restoring punctuation (Cold Start)...")
    start_infer = time.time()
    result = model.restore_punctuation(text)
    infer_time = time.time() - start_infer

    print(f"Original: {text}")
    print(f"Restored: {result}")
    print(f"Inference time 1 (Cold Start): {infer_time:.2f}s\n")

    print("Restoring punctuation (Warm Start)...")
    text2 = "verify the use of this and if found valid then integrate it into the pipeline before integrating understand and report the tradeoffs like latency hallucination etc"
    start_infer2 = time.time()
    result2 = model.restore_punctuation(text2)
    infer_time2 = time.time() - start_infer2

    print(f"Original 2: {text2}")
    print(f"Restored 2: {result2}")
    print(f"Inference time 2 (Warm Start): {infer_time2:.2f}s\n")

    print("Testing hallucination / semantic change...")
    text3 = "let s eat grandma"
    start_infer3 = time.time()
    result3 = model.restore_punctuation(text3)
    
    print(f"Original 3: {text3}")
    print(f"Restored 3: {result3}")
    print(f"Inference time 3: {time.time() - start_infer3:.2f}s\n")

if __name__ == '__main__':
    main()
