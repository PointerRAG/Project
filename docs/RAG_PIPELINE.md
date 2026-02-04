# RAG Ingestion Pipeline Documentation

This document describes the step-by-step process of how **PointerRAG** handles document ingestion, from the initial API request to the final vector storage.

---

## 1. API Request Reception

**File**: [`backend/api/v1/ingestion_routes.py`](../backend/api/v1/ingestion_routes.py)  
**Function**: `ingest_document()`

The process begins when a client sends a `POST` request to `/api/v1/ingest`.

1.  **Input Validation**:
    *   The `file` (UploadFile) and `chat_id` (Form) are received.
    *   The file extension is checked against `SUPPORTED_EXTENSIONS` (`.pdf`, `.txt`, `.md`).
    *   **Size Check**: Enforces a 50MB limit to prevent server overload.
    *   **Empty File Check**: Rejects empty files.

2.  **Chat Verification**:
    *   Queries `db` (Postgres) to verify the `chat_id` exists.

3.  **Handoff**:
    *   If validation passes, the raw file bytes are read and passed to the `IngestionService`.

```python
# CODE REFERENCE: backend/api/v1/ingestion_routes.py
result = service.ingest_file(
    chat_id=chat_id,
    file_bytes=file_bytes,
    filename=filename
)
```

---

## 2. Ingestion Orchestration

**File**: [`backend/services/ingestion_service.py`](../backend/services/ingestion_service.py)  
**Method**: `IngestionService.ingest_file()`

This service acts as the conductor for the pipeline.

1.  **File Type Detection**: Determines if the file is a PDF or Text file.
2.  **Parsing Routing**: Calls the appropriate parser (`parse_pdf` or `parse_text_file`).
3.  **Chunking**: Calls `chunk_text` to split the document.
4.  **Storage**: Calls `VectorService.add_documents` to save embeddings.

---

## 3. Document Parsing

**File**: [`backend/services/ingestion_service.py`](../backend/services/ingestion_service.py)

### Parsing PDF (`parse_pdf`)
*   **Library**: Uses `PyMuPDF` (`fitz`) for robust PDF handling.
*   **Process**:
    *   Opens the PDF stream.
    *   Iterates through each page.
    *   Extracts text using `page.get_text("text")`.
    *   **Cleaning**: Runs `_clean_text()` to normalize whitespace and remove control characters.
*   **Output**: A single string containing the full document text (joined by double newlines).

### Parsing Text (`parse_text_file`)
*   **Encoding**: Attempts multiple encodings (`utf-8`, `utf-8-sig`, `latin-1`) to handle various file origins.
*   **Output**: Cleaned string content.

---

## 4. Text Chunking

**File**: [`backend/services/ingestion_service.py`](../backend/services/ingestion_service.py)  
**Method**: `chunk_text()`

To fetch relevant context effectively, large documents must be split into smaller "chunks".

*   **Strategy**: `RecursiveCharacterTextSplitter` (from LangChain).
*   **Configuration**:
    *   `CHUNK_SIZE`: **800** characters (approx. 200 tokens).
    *   `CHUNK_OVERLAP`: **80** characters (Ensures context isn't lost at cut points).
*   **Separators**: Prioritizes splitting at paragraphs (`\n\n`), then sentences (`. `), then spaces.
*   **Metadata**: Each chunk is assigned metadata:
    *   `source_id`: filename
    *   `chunk_index`: Position in the document
    *   `timestamp`: Ingestion time

```python
# CODE REFERENCE: backend/services/ingestion_service.py
self._text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=CHUNK_SIZE,
    chunk_overlap=CHUNK_OVERLAP,
    separators=CHUNK_SEPARATORS,
    ...
)
```

---

## 5. Vector Embedding & Storage

**File**: [`backend/services/vector_service.py`](../backend/services/vector_service.py)  
**Method**: `add_documents()`

The final step is converting text chunks into mathematical vectors (embeddings) and storing them.

1.  **Collection Management**:
    *   Retrieves (or creates) a ChromaDB collection specific to the chat: `chat_{chat_id}`.
    *   *Why per-chat?* This ensures strict data isolation between conversations.

2.  **Vectorization**:
    *   **Model**: `all-MiniLM-L6-v2` (via `sentence-transformers`).
    *   **Method**: `generate_embedding(text)`.
    *   Converts text into a 384-dimensional vector.

3.  **Storage**:
    *   Calls `collection.add()` to save:
        *   `documents`: The raw text chunk.
        *   `embeddings`: The generated vector.
        *   `metadatas`: Source info.
        *   `ids`: Unique UUID for the chunk.

---

## 6. Metadata Update

**File**: [`backend/api/v1/ingestion_routes.py`](../backend/api/v1/ingestion_routes.py)

After `ingest_file()` returns successfully:

1.  **SQL Update**:
    *   The API route fetches the `Chat` record from the PostgreSQL database.
    *   Increments the `documentCount` field by 1.
    *   Updates `updatedAt` to the current time.
2.  **Response**:
    *   Returns an `IngestResponse` JSON to the frontend, confirming the upload and showing statistics (e.g., "created 15 chunks from 3 pages").

## Summary Flowchart

```mermaid
graph TD
    A[Client Request (POST /ingest)] --> B[API Route (ingestion_routes.py)]
    B --> C{Validation Pass?}
    C -- No --> D[Return Error 400/413/415]
    C -- Yes --> E[IngestionService.ingest_file()]
    E --> F[Parse File (PyMuPDF / Text Decoding)]
    F --> G[Clean Text]
    G --> H[Chunk Text (RecursiveSplitter)]
    H --> I[VectorService.add_documents()]
    I --> J[Generate Embeddings (all-MiniLM-L6-v2)]
    J --> K[Store in ChromaDB (Collection: chat_ID)]
    K --> L[Return Success Stats]
    L --> M[Update SQL Chat.documentCount]
    M --> N[Return JSON Response]
```
