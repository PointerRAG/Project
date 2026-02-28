import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.services.vector_service import VectorService

def debug():
    try:
        print("Initializing VectorService...")
        service = VectorService()
        
        # Checking model
        print("Loading model...")
        model = service.model
        print(f"Model loaded: {model}")
        
        # Create a dummy collection
        chat_id = "debug_chat_id"
        print(f"Creating collection for {chat_id}...")
        collection = service.get_collection(chat_id)
        print("Collection retrieved.")
        
        # Add doc
        print("Adding document...")
        service.add_documents(chat_id, ["Test text"], [{"source": "debug"}])
        print("Document added.")
        
        # Search
        print("Searching...")
        results = service.search_documents(chat_id, "Test", top_k=1)
        print(f"Search results: {results}")
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug()
