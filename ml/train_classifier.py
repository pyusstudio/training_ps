"""
Train a simple classifier on prepared ML dataset and export it for use in the backend.
"""

from __future__ import annotations

import json
from pathlib import Path

from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report
import joblib


def main() -> None:
  dataset_path = Path("ml_dataset.json")
  if not dataset_path.exists():
      raise SystemExit("ml_dataset.json not found. Run prepare_dataset.py first.")

  data = json.loads(dataset_path.read_text(encoding="utf-8"))
  X = data["embeddings"]
  y_raw = data["labels"]

  le = LabelEncoder()
  y = le.fit_transform(y_raw)

  clf = LogisticRegression(max_iter=200)
  clf.fit(X, y)

  y_pred = clf.predict(X)
  print(classification_report(y, y_pred, target_names=le.classes_))

  pipeline = Pipeline(
      [
          ("clf", clf),
      ]
  )
  out_dir = Path("ml_models")
  out_dir.mkdir(exist_ok=True)
  joblib.dump(
      {"pipeline": pipeline, "label_encoder": le},
      out_dir / "intent_classifier.joblib",
  )
  print(f"Saved model to {out_dir/'intent_classifier.joblib'}")


if __name__ == "__main__":
  main()

