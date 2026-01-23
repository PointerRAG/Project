# PointerRAG API Reference Guide

This documentation provides a professional reference for verifying and interacting with the PointerRAG backend API.

## Base URL
All API requests were made to:
`http://localhost:8000/api/v1`

---

## 1. Document Ingestion
**Endpoint**: `POST /ingest`

Uploads a file (PDF, TXT, MD) to be parsed, chunked, and stored in the vector database.

### Parameters
| Field | Type | Description |
|-------|------|-------------|
| `chat_id` | Form Data (String) | Unique identifier for the chat session. |
| `file` | Form Data (File) | The document file to upload. |

### Example Usage (cURL)
[View Script](curl_examples/ingest.txt)
```bash
curl -X POST "http://localhost:8000/api/v1/ingest" \
  -F "chat_id=1" \
  -F "file=@your-document.pdf"
```

---

## 2. Vector Search
**Endpoint**: `POST /vector/search`

Retrieves the most relevant document chunks for a given query.

### Payload
| Field | Type | Description |
|-------|------|-------------|
| `chat_id` | String | The chat session to search within. |
| `query` | String | The search text. |
| `top_k` | Integer | (Optional) Number of results to return. Default: 5. |

### Example Usage (cURL)
[View Script](curl_examples/search.txt)
```bash
curl -X POST "http://localhost:8000/api/v1/vector/search" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_id": "1",
    "query": "What are the key findings?",
    "top_k": 5
  }'
```

---

## 3. Collection Statistics
**Endpoint**: `GET /vector/stats/{chat_id}`

Returns standard statistics about a chat's document collection.

### URL Parameters
| Parameter | Description |
|-----------|-------------|
| `chat_id` | The unique identifier of the chat. |

### Example Usage (cURL)
[View Script](curl_examples/stats.txt)
```bash
curl "http://localhost:8000/api/v1/vector/stats/1"
```

---

## 4. Health Check
**Endpoint**: `/health`

Verifies the status of the backend services (ChromaDB, Embedding Model).

```bash
curl "http://localhost:8000/health"
```
