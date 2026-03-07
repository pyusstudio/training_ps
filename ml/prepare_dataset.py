"""
Prepare a training dataset from raw dialog logs into feature/label format suitable
for a small classifier.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import List, Tuple

from sentence_transformers import SentenceTransformer

from backend.app.services.scoring import CANONICAL_EXAMPLES


def load_raw(path: Path) -> List[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def build_features(
    texts: List[str],
    model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
) -> Tuple[list, list]:
    model = SentenceTransformer(model_name)
    embeddings = model.encode(texts, convert_to_numpy=True)
    return embeddings.tolist(), texts


def main() -> None:
    raw_path = Path("ml_data_raw.json")
    if not raw_path.exists():
        raise SystemExit("ml_data_raw.json not found. Run scrape_data.py first.")

    raw = load_raw(raw_path)
    texts = [r["text"] for r in raw]
    labels = [r.get("intent", "Unknown") for r in raw]

    embeddings, _ = build_features(texts)
    out = Path("ml_dataset.json")
    out.write_text(
        json.dumps(
            {"embeddings": embeddings, "labels": labels},
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Wrote dataset with {len(texts)} rows to {out}")


if __name__ == "__main__":
    main()

