from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from loguru import logger
from .ai_service import ai_provider_instance

@dataclass
class IntentScore:
    intent_category: str
    score: int
    sentiment: str
    feedback: str
    keywords_detected: List[str]
    color_hex: str
    empathy_score: int
    detail_score: int
    tone_alignment_score: int


class IntentScoringService:
    """
    AI-powered intent scoring service.
    
    Evaluates responses along 3 dimensions: Empathy, Detail, and Tone Alignment.
    Calculates final category and score out of 100 based on weightings.
    """

    def __init__(self) -> None:
        logger.info("IntentScoringService initialised (AI mode)")

    async def score(self, session_id: str, transcript: str) -> IntentScore:
        text = transcript.strip().lower()
        if not text:
            return IntentScore(
                intent_category="Unknown",
                score=0,
                sentiment="Neutral",
                feedback="No response detected.",
                keywords_detected=[],
                color_hex="#737373",
                empathy_score=0,
                detail_score=0,
                tone_alignment_score=0,
            )

        eval_result = await ai_provider_instance.evaluate_reply(session_id, transcript)
        
        empathy = eval_result.empathy
        detail = eval_result.detail
        tone = eval_result.tone_alignment
        feedback = eval_result.feedback
        
        # Calculate Final Score out of 10
        final_score_10 = (empathy * 0.4) + (detail * 0.4) + (tone * 0.2)
        final_score_100 = int(final_score_10 * 10)
        
        # Categorization Logic
        if final_score_10 >= 9.0:
            category = "The Trusted Advisor"
            color = "#10b981" # green
        elif final_score_10 >= 7.5:
            category = "The Professional"
            color = "#3b82f6" # blue
        elif final_score_10 >= 5.0:
            category = "The Script-Follower"
            color = "#f59e0b" # amber
        elif final_score_10 >= 3.0:
            category = "The Order-Taker"
            color = "#6b7280" # gray
        else:
            category = "The Liability"
            color = "#ef4444" # red
            
        return IntentScore(
            intent_category=category,
            score=final_score_100,
            sentiment="Neutral",
            feedback=feedback,
            keywords_detected=[],
            color_hex=color,
            empathy_score=empathy,
            detail_score=detail,
            tone_alignment_score=tone,
        )

scoring_service = IntentScoringService()
