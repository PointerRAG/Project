import sys
import os
import time
import requests

sys.path.append('d:\\pointerRAG')
os.environ["CUDA_VISIBLE_DEVICES"] = ""  # If needed, but let's just use whatever it's using
from backend.services.vector_service import get_vector_service

# Ingest directly using the service
vector_service = get_vector_service()
chat_id = "test-uuid-5"
text_to_ingest = "Type 2 diabetes mellitus is the most common form and is characterized by insulin resistance and relative insulin deficiency. Genetic predisposition combined with lifestyle factors such as obesity and physical inactivity play a major role. Gestational diabetes occurs during pregnancy and increases the risk of future type 2 diabetes for both mother and child."

print("Ingesting document via VectorService...")
try:
    vector_service.add_documents(
        chat_id=chat_id,
        texts=[text_to_ingest],
        metadatas=[{"source": "test", "page_num": 1, "chunk_index": 0}]
    )
    print("Ingestion complete.")
except Exception as e:
    print("Ingestion error:", e)

# Give ChromaDB a brief moment
time.sleep(1)

url_generate = "http://localhost:8000/api/v1/model/generate"
data_in_context = {
    "chat_id": chat_id,
    "query": "What are the common lifestyle factors that lead to Type 2 diabetes?"
}

def make_request(data):
    try:
        t0 = time.time()
        resp = requests.post(url_generate, json=data)
        result = resp.json()
        t1 = time.time()
        print(f"Query: {data['query']}")
        print(f"Answer: {result.get('answer')}")
        print(f"Time Taken: {t1 - t0:.2f}s\n")
    except Exception as e:
        print(f"Query: {data['query']} | Error: {e}")

print("Testing In Context Query:")
make_request(data_in_context)
