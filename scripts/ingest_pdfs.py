"""
AiTaxBot Knowledge Base Ingestion Script
=========================================
Chunks PDFs from the Bare Act + ICAI Material folder,
generates Gemini embeddings, and uploads to Qdrant.

Run ONCE to populate the knowledge base.
Re-run whenever new PDFs are added by admin.

Requirements (install once):
    pip install pdfplumber google-genai qdrant-client python-dotenv tqdm

Usage:
    cd C:\\Users\\Vicky\\ATB\\aitaxbot-upload\\Ai-tax-Bot
    python scripts/ingest_pdfs.py

Environment variables needed in .env (or set directly below):
    GOOGLE_API_KEY=...
    QDRANT_URL=...
    QDRANT_API_KEY=...
    QDRANT_COLLECTION=aitaxbot-knowledge
"""

import os
import re
import uuid
import time
import pdfplumber
from pathlib import Path
from dotenv import load_dotenv

import requests
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct
)

try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

# ─── Config ──────────────────────────────────────────────────────────────────

load_dotenv()

GOOGLE_API_KEY   = os.getenv("GOOGLE_API_KEY", "")
QDRANT_URL       = os.getenv("QDRANT_URL", "")
QDRANT_API_KEY   = os.getenv("QDRANT_API_KEY", "")
COLLECTION       = os.getenv("QDRANT_COLLECTION", "aitaxbot-knowledge")
EMBEDDING_MODEL  = "gemini-embedding-001"  # 3072-dim (gemini-embedding-001 default)
VECTOR_SIZE      = 3072

CHUNK_SIZE       = 600    # tokens (~4 chars/token = ~2400 chars)
CHUNK_OVERLAP    = 100    # overlap to preserve context across chunks
BATCH_SIZE       = 50     # points per Qdrant upsert batch
EMBED_DELAY      = 0.1    # seconds between Gemini embed calls (rate limit)

# ─── PDF source folders ───────────────────────────────────────────────────────

BASE_DIR = Path(r"C:\Users\Vicky\ATB\Bare Act and Study Material")

PDF_SOURCES = [
    {
        "path": BASE_DIR / "Income_Tax_Act_2025_as_amended_by_FA_Act_2026.pdf",
        "source_type": "ita_2025",
        "concepts": ["regime_choice", "salary_income", "capital_gains", "business_income",
                     "section_87a", "advance_tax", "itr_deadline", "tds_salary"]
    },
    {
        "path": BASE_DIR / "En-Notified-IT-Rules-2026-20-03-2026.pdf",
        "source_type": "it_rules_2026",
        "concepts": ["hra", "gift_tax", "lta", "tds_other"]
    },
    # ICAI chapters — each tagged with its primary concept area
    {"path": BASE_DIR / "ICAI Material" / "CH1.pdf",  "source_type": "icai_material", "concepts": ["salary_income", "regime_choice"]},
    {"path": BASE_DIR / "ICAI Material" / "CH2.pdf",  "source_type": "icai_material", "concepts": ["hra", "standard_deduction", "lta"]},
    {"path": BASE_DIR / "ICAI Material" / "CH3.pdf",  "source_type": "icai_material", "concepts": ["business_income", "gst_compliance"]},
    {"path": BASE_DIR / "ICAI Material" / "CH4.pdf",  "source_type": "icai_material", "concepts": ["business_income", "audit_44ab"]},
    {"path": BASE_DIR / "ICAI Material" / "CH5.pdf",  "source_type": "icai_material", "concepts": ["capital_gains", "property_gains"]},
    {"path": BASE_DIR / "ICAI Material" / "CH6.pdf",  "source_type": "icai_material", "concepts": ["capital_gains", "equity_stcg", "equity_ltcg"]},
    {"path": BASE_DIR / "ICAI Material" / "CH7.pdf",  "source_type": "icai_material", "concepts": ["other_income", "gift_tax", "crypto_vda"]},
    {"path": BASE_DIR / "ICAI Material" / "CH8.pdf",  "source_type": "icai_material", "concepts": ["set_off_rules", "advance_tax"]},
    {"path": BASE_DIR / "ICAI Material" / "CH9.pdf",  "source_type": "icai_material", "concepts": ["section_80c", "section_80d", "nps_80ccd1b"]},
    {"path": BASE_DIR / "ICAI Material" / "CH10.pdf", "source_type": "icai_material", "concepts": ["section_80c", "home_loan"]},
    {"path": BASE_DIR / "ICAI Material" / "CH11.pdf", "source_type": "icai_material", "concepts": ["regime_choice", "section_87a", "surcharge"]},
    {"path": BASE_DIR / "ICAI Material" / "CH12.pdf", "source_type": "icai_material", "concepts": ["itr_form_selection", "itr_deadline"]},
    {"path": BASE_DIR / "ICAI Material" / "CH13.pdf", "source_type": "icai_material", "concepts": ["tds_salary", "tds_other", "advance_tax"]},
    {"path": BASE_DIR / "ICAI Material" / "CH14.pdf", "source_type": "icai_material", "concepts": ["ais_reconciliation", "form_16"]},
    {"path": BASE_DIR / "ICAI Material" / "CH15.pdf", "source_type": "icai_material", "concepts": ["nri_taxation"]},
    {"path": BASE_DIR / "ICAI Material" / "CH16.pdf", "source_type": "icai_material", "concepts": ["capital_gains", "debt_mf"]},
    {"path": BASE_DIR / "ICAI Material" / "CH17.pdf", "source_type": "icai_material", "concepts": ["gst_compliance", "business_income"]},
    {"path": BASE_DIR / "ICAI Material" / "CH18.pdf", "source_type": "icai_material", "concepts": ["advance_tax", "tds_other"]},
    {"path": BASE_DIR / "ICAI Material" / "CH19.pdf", "source_type": "icai_material", "concepts": ["section_80c", "section_80d"]},
    {"path": BASE_DIR / "ICAI Material" / "CH20.pdf", "source_type": "icai_material", "concepts": ["business_income", "professional_tax"]},
    {"path": BASE_DIR / "ICAI Material" / "CH21.pdf", "source_type": "icai_material", "concepts": ["property_gains", "section_54"]},
    {"path": BASE_DIR / "ICAI Material" / "CH22.pdf", "source_type": "icai_material", "concepts": ["equity_stcg", "equity_ltcg", "crypto_vda"]},
    {"path": BASE_DIR / "ICAI Material" / "CH23.pdf", "source_type": "icai_material", "concepts": ["ais_reconciliation", "itr_deadline"]},
    {"path": BASE_DIR / "ICAI Material" / "CH24.pdf", "source_type": "icai_material", "concepts": ["nri_taxation", "dtaa"]},
    {"path": BASE_DIR / "ICAI Material" / "CH25.pdf", "source_type": "icai_material", "concepts": ["surcharge", "section_87a"]},
    {"path": BASE_DIR / "ICAI Material" / "CH26.pdf", "source_type": "icai_material", "concepts": ["gst_compliance"]},
    {"path": BASE_DIR / "ICAI Material" / "CH27.pdf", "source_type": "icai_material", "concepts": ["business_income", "audit_44ab"]},
    {"path": BASE_DIR / "ICAI Material" / "CH28.pdf", "source_type": "icai_material", "concepts": ["advance_tax", "tds_other"]},
    {"path": BASE_DIR / "ICAI Material" / "Annex M1.pdf", "source_type": "icai_material", "concepts": ["itr_form_selection", "ais_reconciliation"]},
    {"path": BASE_DIR / "ICAI Material" / "Annex M4.pdf", "source_type": "icai_material", "concepts": ["capital_gains", "set_off_rules"]},
]

# ─── Text cleaning ────────────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    """Remove excessive whitespace, page headers, and table noise."""
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    text = re.sub(r'^\d+\s*$', '', text, flags=re.MULTILINE)  # lone page numbers
    text = re.sub(r'(ICAI|Income Tax|AiTaxBot)[^\n]{0,60}\n', '', text)  # running headers
    return text.strip()

# ─── Chunking ─────────────────────────────────────────────────────────────────

def chunk_text(text: str, source: str, page_offset: int = 0) -> list[dict]:
    """
    Split text into overlapping chunks.
    Returns list of: {text, char_start, estimated_page}
    """
    words = text.split()
    chunks = []
    step = CHUNK_SIZE - CHUNK_OVERLAP

    for i in range(0, len(words), step):
        chunk_words = words[i : i + CHUNK_SIZE]
        if len(chunk_words) < 30:  # Skip very short trailing chunks
            continue
        chunk_text = " ".join(chunk_words)
        estimated_page = page_offset + (i // 300)  # rough page estimate (~300 words/page)
        chunks.append({
            "text": chunk_text,
            "page": estimated_page,
        })

    return chunks

# ─── PDF extraction ───────────────────────────────────────────────────────────

def extract_pdf_chunks(source_info: dict) -> list[dict]:
    """Extract text from a PDF and return as tagged chunks."""
    pdf_path = source_info["path"]
    source_type = source_info["source_type"]
    concepts = source_info.get("concepts", [])
    source_name = pdf_path.name

    if not pdf_path.exists():
        print(f"  ⚠️  SKIPPING (not found): {pdf_path}")
        return []

    chunks = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            page_texts = []

            for page in pdf.pages:
                page_text = page.extract_text() or ""
                page_texts.append(page_text)
                full_text += page_text + "\n\n"

            full_text = clean_text(full_text)
            raw_chunks = chunk_text(full_text, source_name)

            for chunk in raw_chunks:
                chunks.append({
                    "id": str(uuid.uuid4()),
                    "text": chunk["text"],
                    "source": source_name,
                    "source_type": source_type,
                    "page": chunk["page"],
                    "concepts": concepts,
                })

    except Exception as e:
        print(f"  ❌ Error extracting {source_name}: {e}")

    return chunks

# ─── Embedding (direct REST — no SDK dependency) ─────────────────────────────
# Calls the Gemini REST API directly to avoid SDK version issues.
# Endpoint: POST /v1/models/{model}:embedContent?key={api_key}

EMBED_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{EMBEDDING_MODEL}:embedContent"

def _embed_one(text: str, retries: int = 5) -> list[float]:
    """Embed a single text via Gemini REST API with exponential backoff on 503/429."""
    delay = 5  # start with 5s, doubles each retry
    for attempt in range(retries):
        resp = requests.post(
            EMBED_URL,
            params={"key": GOOGLE_API_KEY},
            json={
                "model": f"models/{EMBEDDING_MODEL}",
                "content": {"parts": [{"text": text}]},
                "taskType": "RETRIEVAL_DOCUMENT",
            },
            timeout=20,
        )
        if resp.status_code == 200:
            return resp.json()["embedding"]["values"]
        if resp.status_code in (429, 503):
            wait = delay * (2 ** attempt)
            print(f"  ⏳ HTTP {resp.status_code} — retrying in {wait}s (attempt {attempt+1}/{retries})...")
            time.sleep(wait)
            continue
        # Non-retryable error
        data = resp.json()
        raise RuntimeError(f"HTTP {resp.status_code}: {data.get('error', data)}")
    raise RuntimeError(f"Gemini embedding failed after {retries} retries (persistent 503/429)")

def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts using Gemini REST API. Retries on transient errors — never uses zero vectors."""
    vectors = []
    for text in texts:
        try:
            vectors.append(_embed_one(text))
        except Exception as e:
            # Hard failure after all retries — abort the batch, don't silently store useless zero vectors
            raise RuntimeError(f"Embedding failed permanently: {e}")
        time.sleep(EMBED_DELAY)
    return vectors

# ─── Qdrant setup ────────────────────────────────────────────────────────────

def ensure_collection(client: QdrantClient) -> None:
    """Create Qdrant collection if it doesn't exist.
    Recreate if it exists but is empty OR has wrong vector dimensions."""
    existing = {c.name for c in client.get_collections().collections}
    if COLLECTION in existing:
        info = client.get_collection(COLLECTION)
        count = getattr(info, "points_count", None) or getattr(info, "vectors_count", None) or 0

        # Check vector size — must match VECTOR_SIZE (e.g. old 768-dim vs new 3072-dim)
        existing_dim = None
        try:
            cfg = info.config.params.vectors
            if hasattr(cfg, "size"):
                existing_dim = cfg.size
            elif isinstance(cfg, dict) and "" in cfg:
                existing_dim = cfg[""].size
        except Exception:
            pass

        if existing_dim is not None and existing_dim != VECTOR_SIZE:
            print(f"  ⚠️  Collection has wrong dimension ({existing_dim}-dim, need {VECTOR_SIZE}-dim) — recreating...")
            client.delete_collection(COLLECTION)
        elif count > 0:
            print(f"  ✅ Collection '{COLLECTION}' already has {count} vectors with correct {VECTOR_SIZE}-dim — skipping ingestion.")
            return
        else:
            print(f"  Collection '{COLLECTION}' exists but is empty — recreating...")
            client.delete_collection(COLLECTION)

    print(f"Creating Qdrant collection '{COLLECTION}' ({VECTOR_SIZE}-dim Cosine)...")
    client.create_collection(
        collection_name=COLLECTION,
        vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
    )
    print("  ✅ Collection created")

# ─── Main ingestion ───────────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("AiTaxBot Knowledge Base Ingestion")
    print("=" * 60)

    # Validate env
    if not GOOGLE_API_KEY:
        print("❌ GOOGLE_API_KEY not set in .env")
        return
    if not QDRANT_URL or not QDRANT_API_KEY:
        print("❌ QDRANT_URL or QDRANT_API_KEY not set in .env")
        print("   Create a free cluster at https://cloud.qdrant.io")
        return

    # Test embedding via REST before extracting PDFs — fail fast on bad key/model
    print("\nTesting Gemini embedding API (REST)...")
    try:
        test_vec = _embed_one("test")
        dim = len(test_vec)
        print(f"  ✅ Embedding API working — {dim}-dim vector")
        global VECTOR_SIZE
        VECTOR_SIZE = dim  # use actual dimension in case it differs
    except Exception as e:
        print(f"  ❌ Embedding test failed: {e}")
        print(f"\n  URL tried: {EMBED_URL}")
        print(f"  Key (first 8 chars): {GOOGLE_API_KEY[:8]}...")
        print("  → Verify GOOGLE_API_KEY in .env has no extra spaces")
        print("  → Make sure 'Generative Language API' is enabled in Google Cloud Console")
        return

    # Connect to Qdrant
    print(f"\nConnecting to Qdrant at {QDRANT_URL}...")
    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
    ensure_collection(client)

    # Extract chunks from all PDFs
    print(f"\nExtracting text from {len(PDF_SOURCES)} PDF sources...")
    all_chunks: list[dict] = []

    source_iter = tqdm(PDF_SOURCES) if HAS_TQDM else PDF_SOURCES
    for source_info in source_iter:
        name = Path(source_info["path"]).name
        if not HAS_TQDM:
            print(f"  📄 {name}")
        chunks = extract_pdf_chunks(source_info)
        all_chunks.extend(chunks)
        if not HAS_TQDM:
            print(f"     → {len(chunks)} chunks")

    print(f"\n✅ Total chunks extracted: {len(all_chunks)}")

    # Embed and upload in batches — resume from last successful batch if interrupted
    already_uploaded = getattr(client.get_collection(COLLECTION), "points_count", None) \
                    or getattr(client.get_collection(COLLECTION), "vectors_count", None) or 0
    skip_batches = already_uploaded // BATCH_SIZE
    if skip_batches > 0:
        print(f"\n♻️  Resuming: {already_uploaded} vectors already in Qdrant — skipping first {skip_batches} batches.")

    print(f"\nEmbedding and uploading to Qdrant (batch size: {BATCH_SIZE})...")
    print("This may take 10–20 minutes depending on document size.\n")

    uploaded = already_uploaded
    batches = list(range(0, len(all_chunks), BATCH_SIZE))
    batch_iter = batches[skip_batches:]
    if HAS_TQDM:
        batch_iter = tqdm(batch_iter, desc="Uploading batches", total=len(batches), initial=skip_batches)

    for i in batch_iter:
        batch = all_chunks[i : i + BATCH_SIZE]
        texts = [c["text"] for c in batch]

        # Generate embeddings (retries on 503/429 — never uses zero vectors)
        vectors = embed_batch(texts)

        # Build Qdrant points
        points = [
            PointStruct(
                id=chunk["id"],
                vector=vector,
                payload={
                    "text": chunk["text"],
                    "source": chunk["source"],
                    "source_type": chunk["source_type"],
                    "page": chunk["page"],
                    "concepts": chunk["concepts"],
                }
            )
            for chunk, vector in zip(batch, vectors)
        ]

        # Upsert to Qdrant
        client.upsert(collection_name=COLLECTION, points=points)
        uploaded += len(points)

        if not HAS_TQDM:
            print(f"  Uploaded {uploaded}/{len(all_chunks)} chunks...")

    print(f"\n{'=' * 60}")
    print(f"✅ Ingestion complete!")
    print(f"   Total vectors uploaded: {uploaded}")
    print(f"   Collection: {COLLECTION}")
    print(f"   Qdrant URL: {QDRANT_URL}")
    print(f"\nYour AI is ready. Test it at:")
    print(f"   POST https://www.aitaxbot.co.in/api/ai/query")
    print(f"   Body: {{\"question\": \"What is the 80C deduction limit?\"}}")
    print("=" * 60)


if __name__ == "__main__":
    main()
