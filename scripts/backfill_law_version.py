"""
AiTaxBot Knowledge Base — law_version Backfill
================================================
Tags every point already in Qdrant with `law_version` ("ita_2025" or
"ita_1961"), matched by its existing `source` payload field, WITHOUT
re-embedding anything.

Why this exists: ingest_pdfs.py now writes `law_version` on every new point
(see PDF_SOURCES there), but ensure_collection() skips ingestion entirely
when the collection already has vectors — so re-running ingest_pdfs.py does
NOT retroactively tag the points that are already live in Qdrant. This
script does that one-time backfill using Qdrant's set_payload (a metadata-
only write), so it costs zero Gemini embedding calls and takes seconds, not
the 10-20 minutes a full re-ingest would.

Run ONCE after deploying the law_version change, before relying on it in
server/ragService.ts's per-chunk citations.

Usage:
    cd C:\\Users\\Vicky\\ATB\\aitaxbot-upload\\Ai-tax-Bot
    python scripts/backfill_law_version.py
"""

import os
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, PayloadSchemaType

from ingest_pdfs import PDF_SOURCES, COLLECTION, ensure_payload_indexes

load_dotenv()

QDRANT_URL = os.getenv("QDRANT_URL", "")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY", "")


def main():
    if not QDRANT_URL or not QDRANT_API_KEY:
        print("❌ QDRANT_URL or QDRANT_API_KEY not set in .env")
        return

    client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)

    # Build source filename -> law_version from the same config ingest_pdfs.py
    # uses, so the two files can never disagree about which source is which.
    source_to_law: dict[str, str] = {}
    for source_info in PDF_SOURCES:
        source_to_law[source_info["path"].name] = source_info["law_version"]

    print(f"Backfilling law_version on collection '{COLLECTION}'...")
    print(f"{len(source_to_law)} known sources.\n")

    # Payload indexes are needed for the "concepts" filter server-side, and
    # for the "source" filter used below — ensure both exist before we rely
    # on filtering by source.
    ensure_payload_indexes(client)
    try:
        client.create_payload_index(
            collection_name=COLLECTION, field_name="source",
            field_schema=PayloadSchemaType.KEYWORD,
        )
    except Exception as e:
        print(f"  ℹ️  Payload index on 'source': {e}")

    total_updated = 0
    for source_name, law_version in source_to_law.items():
        result = client.set_payload(
            collection_name=COLLECTION,
            payload={"law_version": law_version},
            points=Filter(
                must=[FieldCondition(key="source", match=MatchValue(value=source_name))]
            ),
        )
        print(f"  {source_name:45s} -> {law_version}  ({result.status})")
        total_updated += 1

    print(f"\n✅ Backfill requests sent for {total_updated} source files.")
    print("   Spot-check with checkRAGHealth or a direct query — points from")
    print("   sources not in PDF_SOURCES (if any) are left untouched.")


if __name__ == "__main__":
    main()
