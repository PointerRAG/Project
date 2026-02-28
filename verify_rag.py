import requests
import json
import os

BASE_URL = "http://localhost:8001/api/v1"

def verify_rag():
    print("1. Creating Chat...")
    try:
        res = requests.post(f"{BASE_URL}/chat/", json={"title": "RAG Verification Chat"})
        res.raise_for_status()
        chat_data = res.json()
        chat_id = chat_data['id']
        print(f"Chat created: {chat_id}")
    except Exception as e:
        print(f"Failed to create chat: {e}")
        return

    print("\n2. Creating dummy document...")
    dummy_content = "PointerRAG is a high-performance RAG system using FastAPI and Next.js. It supports PDF and Text ingestion."
    with open("test_doc.txt", "w") as f:
        f.write(dummy_content)
    
    print("\n3. Ingesting Document...")
    try:
        with open("test_doc.txt", "rb") as f:
            files = {'file': ('test_doc.txt', f, 'text/plain')}
            data = {'chat_id': chat_id}
            res = requests.post(f"{BASE_URL}/ingest/", files=files, data=data)
            print(f"Ingestion Status: {res.status_code}")
            print(res.text)
            res.raise_for_status()
    except Exception as e:
        print(f"Failed to ingest document: {e}")
        return

    print("\n4. Querying...")
    try:
        query = "What is PointerRAG?"
        res = requests.post(f"{BASE_URL}/chat/{chat_id}/message", json={"role": "user", "content": query})
        print(f"Query Status: {res.status_code}")
        if res.status_code == 200:
            ai_msg = res.json()
            print(f"AI Response: {ai_msg['content']}")
            if "PointerRAG" in ai_msg['content'] or "FastAPI" in ai_msg['content']:
                print("VERIFICATION SUCCESS: Context was retrieved!")
            else:
                print("VERIFICATION WARNING: Response might be generic.")
        else:
            print(res.text)
    except Exception as e:
        print(f"Failed to query: {e}")

if __name__ == "__main__":
    verify_rag()
