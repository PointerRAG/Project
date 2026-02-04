import requests
import sys

# API Base URL
BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_ingestion():
    # 1. Create a Chat first
    print("Creating chat...")
    chat_res = requests.post(f"{BASE_URL}/chat/", json={"title": "Ingestion Test Chat"})
    if chat_res.status_code != 200:
        print(f"Failed to create chat: {chat_res.text}")
        return
    
    chat_id = chat_res.json()["id"]
    print(f"Chat created: {chat_id}")

    # 2. Upload a File
    print("Uploading file...")
    files = {
        'file': ('test.txt', b'This is a test document content for RAG.', 'text/plain')
    }
    data = {'chat_id': chat_id}
    
    try:
        ingest_res = requests.post(f"{BASE_URL}/ingest", files=files, data=data)
        print(f"Ingest Status: {ingest_res.status_code}")
        print(f"Ingest Response: {ingest_res.text}")
        
        if ingest_res.status_code == 200:
            # 3. Check Chat Details for documentCount
            print("Checking updated chat details...")
            check_res = requests.get(f"{BASE_URL}/chat/{chat_id}")
            chat_data = check_res.json()
            print(f"Document Count: {chat_data.get('documentCount')}")
    except Exception as e:
        print(f"Error during ingestion: {e}")

if __name__ == "__main__":
    test_ingestion()
