
import urllib.request
import urllib.error
import json
import time
import os
import sys
import mimetypes

BASE_URL = "http://localhost:8000/api/v1"
CHAT_ID = "test-verification-chat"
FILENAME = "test_doc.txt"
FILE_CONTENT = """
PointerRAG Verification Document
================================

This is a test document to verify the ingestion pipeline.
It contains enough text to potentially be chunked if the chunk size is small,
but for our default 800 chars, this will likely be a single chunk.

We want to verify:
1. The file is accepted.
2. It is parsed correctly.
3. Chunks are created.
4. Chunks are stored in ChromaDB.
5. Stats reflect the changes.

End of test document.
"""

def create_test_file():
    with open(FILENAME, "w", encoding="utf-8") as f:
        f.write(FILE_CONTENT)
    print(f"Created {FILENAME}")

def post_multipart(url, fields, files):
    boundary = '---BOUNDARY---'
    body = []
    
    for key, value in fields.items():
        body.append(f'--{boundary}')
        body.append(f'Content-Disposition: form-data; name="{key}"')
        body.append('')
        body.append(value)
        
    for key, (filename, content) in files.items():
        body.append(f'--{boundary}')
        body.append(f'Content-Disposition: form-data; name="{key}"; filename="{filename}"')
        body.append('Content-Type: text/plain')
        body.append('')
        body.append(content)
        
    body.append(f'--{boundary}--')
    body.append('')
    
    body_bytes = '\r\n'.join(body).encode('utf-8')
    req = urllib.request.Request(url, data=body_bytes)
    req.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

def get_stats(chat_id):
    url = f"{BASE_URL}/vector/stats/{chat_id}"
    try:
        with urllib.request.urlopen(url) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"Error getting stats: {e}")
        return None

def main():
    print("Starting verification...")
    create_test_file()
    
    # Wait for server to ensure it is up
    time.sleep(2)
    
    print("\n1. Ingesting document...")
    with open(FILENAME, "r", encoding="utf-8") as f:
        content = f.read()
    
    response = post_multipart(
        f"{BASE_URL}/ingest", 
        {"chat_id": CHAT_ID}, 
        {"file": (FILENAME, content)}
    )
    
    print("Ingest Response:")
    print(json.dumps(response, indent=2))
    
    if response.get("chunks_created", 0) > 0:
        print("\nSUCCESS: Document ingested and chunks created.")
    else:
        print("\nFAILURE: No chunks created.")
        sys.exit(1)
        
    print("\n2. Checking stats...")
    stats = get_stats(CHAT_ID)
    print("Stats Response:")
    print(json.dumps(stats, indent=2))
    
    if stats and stats.get("document_count", 0) > 0:
        print("\nSUCCESS: Document count verified in stats.")
    else:
        print("\nFAILURE: Stats do not show stored documents.")
        sys.exit(1)
    
    # Clean up
    if os.path.exists(FILENAME):
        os.remove(FILENAME)
        
    print("\nVerification Complete!")

if __name__ == "__main__":
    main()
