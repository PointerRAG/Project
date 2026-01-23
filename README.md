# PointerRAG

PointerRAG is a Retrieval-Augmented Generation (RAG) system that allows users to chat with their documents. It consists of a modern Next.js frontend and a robust FastAPI backend powered by ChromaDB.

## Features

-   **Chat Interface**: Real-time chat with AI assistance.
-   **Document Ingestion**: Upload PDF, TXT, and Markdown files.
-   **RAG Pipeline**:
    -   Automatic text chunking and embedding.
    -   Vector search using ChromaDB.
    -   Context-aware responses (coming soon).
-   **Backend API**: Fast and scalable API built with FastAPI.

## Tech Stack

### Frontend
-   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
-   **Styling**: Tailwind CSS, Shadcn UI
-   **Icons**: Lucide React

### Backend
-   **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
-   **Vector Database**: [ChromaDB](https://www.trychroma.com/) (Persistent Storage)
-   **Embeddings**: `all-MiniLM-L6-v2` (via Sentence Transformers)
-   **PDF Processing**: PyMuPDF (fitz)

---

## Getting Started

### Prerequisites
-   Node.js 18+
-   Python 3.10+

### 1. Backend Setup

Navigate to the `backend` directory and install dependencies:

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
# source venv/bin/activate

pip install -r requirements.txt
```

Start the backend server:

```bash
# Must be run from the project root or backend directory
# If running from project root:
python -m uvicorn backend.main:app --port 8000 --reload
```
The API will be available at `http://localhost:8000`.
-   **Swagger UI**: `http://localhost:8000/docs`
-   **API Reference**: See `docs/API_REFERENCE.md`

### 2. Frontend Setup

Install dependencies and start the development server:

```bash
# In the project root
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Documentation

Comprehensive API documentation and usage examples are available in the `docs/` folder:

-   **[API Reference](docs/API_REFERENCE.md)**: Detailed endpoints guide.
-   **[Curl Examples](docs/curl_examples/)**: Ready-to-use scripts for testing Ingestion, Search, and Stats.

## Project Structure

```
pointerRAG/
├── app/                  # Next.js App Router pages
├── backend/              # Python FastAPI Backend
│   ├── api/              # API Routes (v1)
│   ├── core/             # Configuration & Database
│   ├── schemas/          # Pydantic Models
│   ├── services/         # Business Logic (Vector, Ingestion)
│   └── main.py           # Entry point
├── components/           # React Components
├── docs/                 # Documentation & Examples
└── public/               # Static Assets
```
