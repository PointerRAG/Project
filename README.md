# PointerRAG

PointerRAG is a Retrieval-Augmented Generation (RAG) system that allows users to chat with their documents. It consists of a modern Next.js frontend and a robust FastAPI backend powered by ChromaDB AND PostgreSQL.

## Features

- **Chat Interface**: Real-time chat with AI assistance.
- **Persistent History**: Chat sessions and messages are saved in PostgreSQL.
- **Document Ingestion**: Upload PDF, TXT, and Markdown files.
- **RAG Pipeline**:
  - Automatic text chunking and embedding.
  - Vector search using ChromaDB.
  - Context-aware responses.
- **Backend API**: Fast and scalable API built with FastAPI.

## Tech Stack

### Frontend

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Styling**: Tailwind CSS, Shadcn UI
- **Icons**: Lucide React

### Backend

- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Primary Database**: **PostgreSQL** (Chat History)
- **Vector Database**: [ChromaDB](https://www.trychroma.com/) (Document Embeddings)
- **ORM/Database**: SQLAlchemy (Python) & Prisma (Schema Management)
- **Embeddings**: `all-MiniLM-L6-v2` (via Sentence Transformers)
- **PDF Processing**: PyMuPDF (fitz)

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- **PostgreSQL** (Running locally or hosted)

### 1. Environment Configuration

Copy the provided `.env.example` to create a `.env` file in the root directory and ensure the **DATABASE_URL** is set:

```properties
DATABASE_URL=postgresql://admin:password@localhost:5432/pointerrag
```

**Run Local Database via Docker (Recommended):**
If you don't have PostgreSQL installed locally, you can easily spin up a containerized database using the provided `docker-compose.yml`:

```bash
docker-compose up -d
```

### 2. Backend Setup

Navigate to the project root and install dependencies:

```bash
# Activate your virtual environment first
pip install -r backend/requirements.txt
```

**Initialize the Database:**
Run the initialization script to create the necessary tables (`Chat`, `Message`) in Postgres:

```bash
python scripts/init_db.py
```

Start the backend server:

```bash
uvicorn backend.main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **API Reference**: See `docs/API_REFERENCE.md`

### 3. Frontend Setup

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## Database Management Scripts

The project includes utility scripts in the `scripts/` folder to help manage the database:

- **Initialize Database**: Creates tables if they don't exist.

  ```bash
  python scripts/init_db.py
  ```

- **Reset Database**: **WARNING** - Drops all `Chat` and `Message` tables and recreates them. Use this to clear all history.

  ```bash
  python scripts/reset_db.py
  ```

- **Test API**: Runs a quick verification to ensure the Backend API is working and creating chats correctly.
  ```bash
  python scripts/test_chat_api.py
  ```

---

## Documentation

Comprehensive API documentation and usage examples are available in the `docs/` folder:

- **[API Reference](docs/API_REFERENCE.md)**: Detailed endpoints guide.
- **[Curl Examples](docs/curl_examples/)**: Ready-to-use scripts for testing Ingestion, Search, and Stats.

## Project Structure

```
pointerRAG/
├── app/                  # Next.js App Router pages
├── backend/              # Python FastAPI Backend
│   ├── api/              # API Routes (Ingestion, Chat, Vector)
│   ├── core/             # Configuration & Database Models
│   ├── schemas/          # Pydantic Schemas
│   ├── services/         # Business Logic
│   └── main.py           # Entry point
├── components/           # React Components
├── docs/                 # Documentation & Examples
├── prisma/               # Database Schema (Reference)
├── scripts/              # DB Management Utilities
└── public/               # Static Assets
```
