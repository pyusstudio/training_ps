from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from loguru import logger

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from ..config import get_settings


_SETTINGS = get_settings()


INTENT_COLORS: Dict[str, str] = {
    "Isolate": "#22c55e",
    "Empathy": "#d4d4d4",
    "Defensive": "#ef4444",
}


INTENT_KEYWORDS: Dict[str, List[str]] = {
    "Isolate": [
        "right car",
        "family",
        "value",
        "features",
        "investment",
        "set the price aside",
    ],
    "Empathy": [
        "understand how you feel",
        "felt the same",
        "they found",
        "i understand",
        "i hear you",
    ],
    "Defensive": [
        "fixed price",
        "policy",
        "manager",
        "best we can do",
        "cannot go lower",
    ],
}


CANONICAL_EXAMPLES: Dict[str, str] = {
    "Isolate": (
        "I hear you. If we set the price aside for a moment, "
        "is this the right car for your family?"
    ),
    "Empathy": (
        "I understand how you feel. Many customers felt the same, "
        "but they found the value and safety made up for the cost."
    ),
    "Defensive": (
        "Our prices are fixed by management. This is already the lowest "
        "we can go on this model."
    ),
}


@dataclass
class IntentScore:
    intent_category: str
    score: int
    sentiment: str
    feedback: str
    keywords_detected: List[str]
    color_hex: str


class IntentScoringService:
    """
    Hybrid SBERT + rule-based intent scoring.

    - Uses sentence embeddings for semantic similarity against canonical examples.
    - Uses keyword buckets for robustness and interpretability.
    - Can be extended later with a learning-based classifier.
    """

    def __init__(self) -> None:
        self._model: Optional[SentenceTransformer] = None
        self._canonical_embeddings: Optional[np.ndarray] = None

        try:
            self._model = SentenceTransformer(_SETTINGS.sbert_model_name)
            self._canonical_embeddings = self._model.encode(
                list(CANONICAL_EXAMPLES.values()),
                convert_to_numpy=True,
            )
            logger.info(
                "Loaded SBERT model '{}' for intent scoring",
                _SETTINGS.sbert_model_name,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to load SBERT model: {}", exc)
            self._model = None
            self._canonical_embeddings = None

        # Placeholder for future learning-based classifier
        self._classifier = None
        if _SETTINGS.use_learning_model and _SETTINGS.learning_model_path:
            self._load_learning_model(_SETTINGS.learning_model_path)

    def _load_learning_model(self, path: str) -> None:
        try:
            import joblib

            self._classifier = joblib.load(path)
            logger.info("Loaded learning-based intent classifier from {}", path)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to load learning model: {}", exc)
            self._classifier = None

    def score(self, transcript: str) -> IntentScore:
        text = transcript.strip().lower()
        if not text:
            return IntentScore(
                intent_category="Unknown",
                score=0,
                sentiment="Neutral",
                feedback="No response detected.",
                keywords_detected=[],
                color_hex="#737373",
            )

        keyword_hits: Dict[str, List[str]] = {}
        for intent, keywords in INTENT_KEYWORDS.items():
            matches = [kw for kw in keywords if kw in text]
            if matches:
                keyword_hits[intent] = matches

        sims: Dict[str, float] = {}
        if self._model is not None and self._canonical_embeddings is not None:
            embedding = self._model.encode([text], convert_to_numpy=True)
            sim_values = cosine_similarity(embedding, self._canonical_embeddings)[0]
            for intent, sim in zip(CANONICAL_EXAMPLES.keys(), sim_values, strict=False):
                sims[intent] = float(sim)

        # Combine signals
        intent = self._choose_intent(keyword_hits, sims)
        score = self._compute_score(intent, keyword_hits, sims)
        sentiment = self._sentiment_for_intent(intent)
        feedback = self._build_feedback(intent, keyword_hits, sims)
        color_hex = INTENT_COLORS.get(intent, "#737373")

        detected_keywords = sorted(
            {kw for hits in keyword_hits.values() for kw in hits}
        )

        return IntentScore(
            intent_category=intent,
            score=score,
            sentiment=sentiment,
            feedback=feedback,
            keywords_detected=detected_keywords,
            color_hex=color_hex,
        )

    @staticmethod
    def _choose_intent(
        keyword_hits: Dict[str, List[str]],
        sims: Dict[str, float],
    ) -> str:
        if keyword_hits:
            # Prefer intents with more keyword hits, then by similarity
            best_intent = None
            best_score = -1.0
            for intent, hits in keyword_hits.items():
                count = len(hits)
                sim = sims.get(intent, 0.0)
                combined = count + sim
                if combined > best_score:
                    best_score = combined
                    best_intent = intent
            if best_intent is not None:
                return best_intent

        if sims:
            return max(sims.items(), key=lambda kv: kv[1])[0]

        return "Unknown"

    @staticmethod
    def _compute_score(
        intent: str,
        keyword_hits: Dict[str, List[str]],
        sims: Dict[str, float],
    ) -> int:
        base = 50
        sim = sims.get(intent, 0.0)
        sim_component = int(sim * 40)
        keyword_count = len(keyword_hits.get(intent, []))
        keyword_component = min(keyword_count * 5, 10)

        score = base + sim_component + keyword_component

        if intent == "Defensive":
            score = min(score, 40)

        return max(0, min(100, score))

    @staticmethod
    def _sentiment_for_intent(intent: str) -> str:
        if intent == "Defensive":
            return "Negative"
        if intent in {"Isolate", "Empathy"}:
            return "Positive"
        return "Neutral"

    @staticmethod
    def _build_feedback(
        intent: str,
        keyword_hits: Dict[str, List[str]],
        sims: Dict[str, float],
    ) -> str:
        if intent == "Isolate":
            return (
                "Good job moving from price to value. "
                "Ensure you confirm the car is right for the customer."
            )
        if intent == "Empathy":
            return (
                "Solid empathy. Reinforce the Feel–Felt–Found pattern to connect "
                "with the customer's concern."
            )
        if intent == "Defensive":
            return (
                "Response sounds defensive around price. Avoid arguing policy and "
                "pivot back to value and fit."
            )
        if sims:
            return "Partial alignment with the desired pattern. Refine phrasing to match the briefing examples."
        return "Unable to classify the response. Try including more detail about value, empathy, or objection handling."


scoring_service = IntentScoringService()

