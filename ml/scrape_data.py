"""
Placeholder module for scraping or collecting automotive sales and customer-service
dialogues. In production this should:

- Respect robots.txt and site terms.
- Store raw conversations with metadata for later labeling.
"""

from pathlib import Path
from typing import List


def collect_sample_dialogs() -> List[dict]:
    # For PoC, return a few hard-coded examples instead of real crawling.
    return [
        {
            "text": (
                "I understand how you feel about the price. "
                "Others felt the same but found the safety and fuel savings were worth it."
            ),
            "intent": "Empathy",
            "label": "good",
        },
        {
            "text": (
                "These are our fixed prices set by management. "
                "We cannot go any lower on this model."
            ),
            "intent": "Defensive",
            "label": "bad",
        },
    ]


def main() -> None:
    data = collect_sample_dialogs()
    out = Path("ml_data_raw.json")
    import json

    out.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Wrote {len(data)} dialogs to {out}")


if __name__ == "__main__":
    main()

