import abc
import asyncio
import json
import logging
import re
from typing import Dict, List, Optional
from pydantic import BaseModel

from ..config import get_settings

logger = logging.getLogger("ai_service")
_SETTINGS = get_settings()


def _strip_markdown_fences(text: str) -> str:
    """Robustly strip markdown code fences from LLM JSON responses."""
    text = text.strip()
    # Remove ```json ... ``` or ``` ... ``` blocks
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return text.strip()

SYSTEM_PROMPT = """You are a potential car buyer visiting a dealership. 
You are speaking with a salesperson (the user).
Your role is to act naturally as a customer. 
You are slightly skeptical but genuinely interested in buying a car if the conditions are right.
Keep your responses relatively short (1-3 sentences) as this is a spoken conversation.
Do NOT break character or acknowledge you are an AI.
"""

EVALUATE_REPLY_PROMPT = """You are an expert sales trainer evaluating a salesperson's response in a live roleplay.
You will evaluate their response based on three dimensions:
1. Empathy (0-10): Sentiment & Politeness, validating client concerns, using active listening.
2. Detail (0-10): Informational Depth, precision vs fluff, accurately answering questions.
3. Tone Alignment (0-10): Linguistic Alignment, formal vs informal matching the client's tone.

Review the history of the conversation, paying special attention to the MOST RECENT reply by the salesperson.
Analyze the reply and provide a JSON response with exactly these fields:
- empathy (integer 0-10)
- detail (integer 0-10)
- tone_alignment (integer 0-10)
- feedback (string, 1-2 sentences of constructive feedback)

Respond ONLY with valid JSON.
"""

class SessionRating(BaseModel):
    overall_score: int
    strengths: List[str]
    improvements: List[str]
    detailed_feedback: str

class ReplyEvaluation(BaseModel):
    empathy: int
    detail: int
    tone_alignment: int
    feedback: str

class AIProvider(abc.ABC):
    def __init__(self):
        self.history: Dict[str, List[Dict[str, str]]] = {}

    def _init_history(self, session_id: str):
        if session_id not in self.history:
            self.history[session_id] = [{"role": "system", "content": SYSTEM_PROMPT}]

    @abc.abstractmethod
    async def start_conversation(self, session_id: str, scenario: Optional[str] = None) -> str:
        """Initialize and return the client's opening line."""
        pass

    @abc.abstractmethod
    async def reply(self, session_id: str, salesperson_message: str, is_final: bool = False) -> str:
        """Get the client's next response."""
        pass

    @abc.abstractmethod
    async def rate_session(self, session_id: str, transcript_str: Optional[str] = None) -> SessionRating:
        """Return a structured rating of the session."""
        pass

    @abc.abstractmethod
    async def evaluate_reply(self, session_id: str, salesperson_message: str) -> ReplyEvaluation:
        """Evaluate a single reply from the salesperson."""
        pass

    def cleanup_session(self, session_id: str):
        self.history.pop(session_id, None)


class GeminiProvider(AIProvider):
    def __init__(self):
        super().__init__()
        import google.generativeai as genai
        if not _SETTINGS.gemini_api_key:
            logger.warning("Gemini API key not set")
        else:
            genai.configure(api_key=_SETTINGS.gemini_api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")
    
    # Needs implementation mapping system prompt to Gemini's format...
    # For now, implementing a generic wrapper that can be filled in

    async def start_conversation(self, session_id: str, scenario: Optional[str] = None) -> str:
        self._init_history(session_id)
        
        prompt = "Act as the customer. Look at the context and initiate the conversation naturally. Keep your response to 1-2 realistic sentences."
        self.history[session_id].append({"role": "user", "content": prompt})
        
        try:
            from google.generativeai.types import content_types
            messages = [{"role": msg["role"] if msg["role"] != "system" else "user", "parts": [msg["content"]]} for msg in self.history[session_id]]
            
            chat = self.model.start_chat(history=messages[:-1])
            response = await asyncio.to_thread(chat.send_message, prompt)
            reply = response.text
            self.history[session_id].append({"role": "model", "content": reply})
            return reply
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return f"[AI Error] Hi, tell me what you have in stock. ({str(e)})"

    async def reply(self, session_id: str, salesperson_message: str, is_final: bool = False) -> str:
        self._init_history(session_id)
        self.history[session_id].append({"role": "user", "content": f"Salesperson says: {salesperson_message}"})
        
        prompt = f"Salesperson says: {salesperson_message}. Respond as the customer. Keep it short (1-3 sentences) and conversational."
        if is_final:
            prompt = f"Salesperson says: {salesperson_message}. This is the end of the conversation. Either make an appointment or say goodbye naturally. Keep it short."

        try:
            messages = [{"role": msg["role"] if msg["role"] != "system" else "user", "parts": [msg["content"]]} for msg in self.history[session_id]]
            chat = self.model.start_chat(history=messages[:-1])
            response = await asyncio.to_thread(chat.send_message, prompt)
            reply = response.text
            self.history[session_id].append({"role": "model", "content": reply})
            return reply
        except Exception as e:
            logger.error(f"Gemini API error: {e}")
            return f"[AI Error] That's interesting. Can you tell me more about the price or features? ({str(e)})"

    async def rate_session(self, session_id: str, transcript_str: Optional[str] = None) -> SessionRating:
        transcript = transcript_str if transcript_str else json.dumps(self.history.get(session_id, []))
        prompt = f"""
Review the following conversation between a salesperson and a customer.
Transcript:
{transcript}

Provide a structured JSON rating with:
- overall_score (integer 1-10)
- strengths (list of strings, max 3)
- improvements (list of strings, max 3)
- detailed_feedback (string, 2-3 sentences)
Respond ONLY with valid JSON.
"""
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            text = response.text
            text = _strip_markdown_fences(text)
            data = json.loads(text)
            return SessionRating(
                overall_score=data.get("overall_score", 5),
                strengths=data.get("strengths", []),
                improvements=data.get("improvements", []),
                detailed_feedback=data.get("detailed_feedback", "API error during parsing.")
            )
        except Exception as e:
            logger.error(f"Gemini Rating error: {e}")
            return SessionRating(overall_score=5, strengths=[], improvements=["Could not generate rating due to API error"], detailed_feedback=str(e))

    async def evaluate_reply(self, session_id: str, salesperson_message: str) -> ReplyEvaluation:
        transcript = json.dumps(self.history.get(session_id, []))
        prompt = f"{EVALUATE_REPLY_PROMPT}\nConversation Transcript:\n{transcript}\nSalesperson's latest message:\n{salesperson_message}"
        try:
            response = await asyncio.to_thread(self.model.generate_content, prompt)
            text = _strip_markdown_fences(response.text)
            data = json.loads(text)
            return ReplyEvaluation(
                empathy=data.get("empathy", 5),
                detail=data.get("detail", 5),
                tone_alignment=data.get("tone_alignment", 5),
                feedback=data.get("feedback", "No feedback provided.")
            )
        except Exception as e:
            logger.error(f"Gemini Evaluate error: {e}")
            return ReplyEvaluation(empathy=5, detail=5, tone_alignment=5, feedback=f"API error: {str(e)}")


class OpenAIProvider(AIProvider):
    def __init__(self):
        super().__init__()
        import openai
        if not _SETTINGS.openai_api_key:
            logger.warning("OpenAI API key not set")
        self.client = openai.AsyncOpenAI(api_key=_SETTINGS.openai_api_key)
        self.model = "gpt-4o-mini"

    async def start_conversation(self, session_id: str, scenario: Optional[str] = None) -> str:
        self._init_history(session_id)
        try:
            messages = self.history[session_id].copy()
            messages.append({"role": "user", "content": "Act as the customer. Look at the context and initiate the conversation naturally. Keep your response to 1-2 realistic sentences."})
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=150
            )
            reply = response.choices[0].message.content
            self.history[session_id].append({"role": "assistant", "content": reply})
            return reply
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return "Hi there, I'm here to look at some cars."

    async def reply(self, session_id: str, salesperson_message: str, is_final: bool = False) -> str:
        self._init_history(session_id)
        
        prompt = f"Salesperson says: {salesperson_message}. Respond as the customer. Keep it short (1-3 sentences) and conversational."
        if is_final:
            prompt = f"Salesperson says: {salesperson_message}. This is the end of the conversation. Either make an appointment or say goodbye naturally. Keep it short."
            
        self.history[session_id].append({"role": "user", "content": prompt})
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=self.history[session_id],
                temperature=0.7,
                max_tokens=150
            )
            reply = response.choices[0].message.content
            self.history[session_id].append({"role": "assistant", "content": reply})
            return reply
        except Exception as e:
            logger.error(f"OpenAI API error: {e}")
            return "I see. What kind of financing do you offer?"

    async def rate_session(self, session_id: str, transcript_str: Optional[str] = None) -> SessionRating:
        transcript = transcript_str if transcript_str else json.dumps(self.history.get(session_id, []))
        prompt = f"""
Review the following conversation between a salesperson and a customer.
Transcript:
{transcript}

Provide a structured JSON rating with:
- overall_score (integer 1-10)
- strengths (array of strings, max 3)
- improvements (array of strings, max 3)
- detailed_feedback (string, 2-3 sentences)
"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "You are an expert sales trainer evaluating a call. Output ONLY JSON."},
                    {"role": "user", "content": prompt}
                ]
            )
            data = json.loads(response.choices[0].message.content)
            return SessionRating(
                overall_score=data.get("overall_score", 5),
                strengths=data.get("strengths", []),
                improvements=data.get("improvements", []),
                detailed_feedback=data.get("detailed_feedback", "")
            )
        except Exception as e:
            logger.error(f"OpenAI Rating error: {e}")
            return SessionRating(overall_score=5, strengths=[], improvements=["API error"], detailed_feedback=str(e))

    async def evaluate_reply(self, session_id: str, salesperson_message: str) -> ReplyEvaluation:
        transcript = json.dumps(self.history.get(session_id, []))
        prompt = f"Transcript:\n{transcript}\nLatest Reply:\n{salesperson_message}"
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": EVALUATE_REPLY_PROMPT},
                    {"role": "user", "content": prompt}
                ]
            )
            data = json.loads(response.choices[0].message.content)
            return ReplyEvaluation(
                empathy=data.get("empathy", 5),
                detail=data.get("detail", 5),
                tone_alignment=data.get("tone_alignment", 5),
                feedback=data.get("feedback", "No feedback provided.")
            )
        except Exception as e:
            logger.error(f"OpenAI Evaluate error: {e}")
            return ReplyEvaluation(empathy=5, detail=5, tone_alignment=5, feedback=f"API error: {str(e)}")


class HuggingFaceProvider(AIProvider):
    def __init__(self):
        super().__init__()
        from huggingface_hub import AsyncInferenceClient
        if not _SETTINGS.huggingface_api_key:
            logger.warning("HuggingFace API key not set")
        self.client = AsyncInferenceClient(token=_SETTINGS.huggingface_api_key)
        self.model = _SETTINGS.huggingface_model

    async def start_conversation(self, session_id: str, scenario: Optional[str] = None) -> str:
        self._init_history(session_id)
        try:
            messages = self.history[session_id].copy()
            messages.append({"role": "user", "content": "Act as the customer. Look at the context and initiate the conversation naturally. Keep your response to 1-2 realistic sentences."})
            
            response = await self.client.chat_completion(
                model=self.model,
                messages=messages,
                max_tokens=150,
                temperature=0.7
            )
            if hasattr(response, 'choices') and response.choices:
                reply = response.choices[0].message.content
            else:
                raise ValueError(f"Unexpected response format: {response}")
            self.history[session_id].append({"role": "assistant", "content": reply})
            return reply
        except Exception as e:
            import traceback
            logger.error(f"HuggingFace API error: {e}\n{traceback.format_exc()}")
            return "Hello, I need a reliable commuter car."

    async def reply(self, session_id: str, salesperson_message: str, is_final: bool = False) -> str:
        self._init_history(session_id)
        
        prompt = f"Salesperson says: {salesperson_message}. Respond as the customer. Keep it short (1-3 sentences) and conversational."
        if is_final:
            prompt = f"Salesperson says: {salesperson_message}. This is the end of the conversation. Either make an appointment or say goodbye naturally. Keep it short."
            
        self.history[session_id].append({"role": "user", "content": prompt})
        
        try:
            response = await self.client.chat_completion(
                model=self.model,
                messages=self.history[session_id],
                max_tokens=150,
                temperature=0.7
            )
            if hasattr(response, 'choices') and response.choices:
                reply = response.choices[0].message.content
            else:
                raise ValueError(f"Unexpected response format: {response}")
            self.history[session_id].append({"role": "assistant", "content": reply})
            return reply
        except Exception as e:
            import traceback
            logger.error(f"HuggingFace API error: {e}\n{traceback.format_exc()}")
            return "Is it fuel efficient?"

    async def rate_session(self, session_id: str, transcript_str: Optional[str] = None) -> SessionRating:
        transcript = transcript_str if transcript_str else json.dumps(self.history.get(session_id, []))
        prompt = f"""
Review the following conversation between a salesperson and a customer.
Transcript:
{transcript}

Provide a structured JSON rating with:
- overall_score (integer 1-10)
- strengths (array of strings, max 3)
- improvements (array of strings, max 3)
- detailed_feedback (string, 2-3 sentences)
Respond ONLY with a raw JSON object. Do not use markdown backticks or explanations.
"""
        try:
            response = await self.client.chat_completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert sales trainer evaluating a call. Output ONLY raw JSON."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500
            )
            if hasattr(response, 'choices') and response.choices:
                text = response.choices[0].message.content.strip()
            else:
                raise ValueError(f"Unexpected response format: {response}")
            text = _strip_markdown_fences(text)
                
            data = json.loads(text.strip())
            return SessionRating(
                overall_score=data.get("overall_score", 5),
                strengths=data.get("strengths", []),
                improvements=data.get("improvements", []),
                detailed_feedback=data.get("detailed_feedback", "")
            )
        except Exception as e:
            import traceback
            logger.error(f"HuggingFace Rating error: {e}\n{traceback.format_exc()}")
            return SessionRating(overall_score=5, strengths=[], improvements=["API error"], detailed_feedback=str(e))

    async def evaluate_reply(self, session_id: str, salesperson_message: str) -> ReplyEvaluation:
        transcript = json.dumps(self.history.get(session_id, []))
        prompt = f"Transcript:\n{transcript}\nLatest Reply:\n{salesperson_message}"
        try:
            response = await self.client.chat_completion(
                model=self.model,
                messages=[
                    {"role": "system", "content": EVALUATE_REPLY_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200
            )
            if hasattr(response, 'choices') and response.choices:
                text = _strip_markdown_fences(response.choices[0].message.content.strip())
            else:
                raise ValueError(f"Unexpected response format: {response}")
            data = json.loads(text)
            return ReplyEvaluation(
                empathy=data.get("empathy", 5),
                detail=data.get("detail", 5),
                tone_alignment=data.get("tone_alignment", 5),
                feedback=data.get("feedback", "No feedback provided.")
            )
        except Exception as e:
            import traceback
            logger.error(f"HuggingFace Evaluate error: {e}\n{traceback.format_exc()}")
            return ReplyEvaluation(empathy=5, detail=5, tone_alignment=5, feedback=f"API error: {str(e)}")


class OllamaProvider(AIProvider):
    def __init__(self):
        super().__init__()
        import httpx
        self.base_url = _SETTINGS.ollama_base_url.rstrip("/")
        self.model = _SETTINGS.ollama_model
        # Using a client per request to avoid managing async context globally here
        # but for production you'd use a single httpx.AsyncClient

    async def start_conversation(self, session_id: str, scenario: Optional[str] = None) -> str:
        self._init_history(session_id)
        try:
            import httpx
            messages = self.history[session_id].copy()
            messages.append({"role": "user", "content": "Act as the customer. Look at the context and initiate the conversation naturally. Keep your response to 1-2 realistic sentences."})
            
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{self.base_url}/api/chat",
                    json={"model": self.model, "messages": messages, "stream": False},
                    timeout=30.0
                )
                res.raise_for_status()
                reply = res.json()["message"]["content"]
                
            self.history[session_id].append({"role": "assistant", "content": reply})
            return reply
        except Exception as e:
            logger.error(f"Ollama API error: {e}")
            return f"[AI Error] Hi, do you have any SUVs? ({str(e)})"

    async def reply(self, session_id: str, salesperson_message: str, is_final: bool = False) -> str:
        self._init_history(session_id)
        
        prompt = f"Salesperson says: {salesperson_message}. Respond as the customer. Keep it short (1-3 sentences) and conversational."
        if is_final:
            prompt = f"Salesperson says: {salesperson_message}. This is the end of the conversation. Either make an appointment or say goodbye naturally. Keep it short."
            
        self.history[session_id].append({"role": "user", "content": prompt})
        
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{self.base_url}/api/chat",
                    json={"model": self.model, "messages": self.history[session_id], "stream": False},
                    timeout=30.0
                )
                res.raise_for_status()
                reply = res.json()["message"]["content"]
                
            self.history[session_id].append({"role": "assistant", "content": reply})
            return reply
        except Exception as e:
            logger.error(f"Ollama API error: {e}")
            return f"[AI Error] What's the cargo space like? ({str(e)})"

    async def rate_session(self, session_id: str, transcript_str: Optional[str] = None) -> SessionRating:
        transcript = transcript_str if transcript_str else json.dumps(self.history.get(session_id, []))
        prompt = f"""
Review the following conversation between a salesperson and a customer.
Transcript:
{transcript}

Provide a structured JSON rating with:
- overall_score (integer 1-10)
- strengths (array of strings, max 3)
- improvements (array of strings, max 3)
- detailed_feedback (string, 2-3 sentences)
Respond ONLY with a raw JSON object.
"""
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model, 
                        "messages": [
                            {"role": "system", "content": "You are an expert sales trainer evaluating a call. Output ONLY raw JSON."},
                            {"role": "user", "content": prompt}
                        ], 
                        "stream": False,
                        "format": "json" # Ollama supports strict JSON mode
                    },
                    timeout=60.0 # Ratings take longer
                )
                res.raise_for_status()
                data = json.loads(res.json()["message"]["content"])
                
            return SessionRating(
                overall_score=data.get("overall_score", 5),
                strengths=data.get("strengths", []),
                improvements=data.get("improvements", []),
                detailed_feedback=data.get("detailed_feedback", "")
            )
        except Exception as e:
            logger.error(f"Ollama Rating error: {e}")
            return SessionRating(overall_score=5, strengths=[], improvements=["API error"], detailed_feedback=str(e))

    async def evaluate_reply(self, session_id: str, salesperson_message: str) -> ReplyEvaluation:
        transcript = json.dumps(self.history.get(session_id, []))
        prompt = f"Transcript:\n{transcript}\nLatest Reply:\n{salesperson_message}"
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": EVALUATE_REPLY_PROMPT},
                            {"role": "user", "content": prompt}
                        ],
                        "stream": False,
                        "format": "json"
                    },
                    timeout=30.0
                )
                res.raise_for_status()
                data = json.loads(res.json()["message"]["content"])
            return ReplyEvaluation(
                empathy=data.get("empathy", 5),
                detail=data.get("detail", 5),
                tone_alignment=data.get("tone_alignment", 5),
                feedback=data.get("feedback", "No feedback provided.")
            )
        except Exception as e:
            logger.error(f"Ollama Evaluate error: {e}")
            return ReplyEvaluation(empathy=5, detail=5, tone_alignment=5, feedback=f"API error: {str(e)}")


def get_ai_provider() -> AIProvider:
    provider_name = _SETTINGS.ai_provider.lower()
    if provider_name == "openai":
        return OpenAIProvider()
    elif provider_name == "huggingface":
        return HuggingFaceProvider()
    elif provider_name == "ollama":
        return OllamaProvider()
    else:
        return GeminiProvider()

ai_provider_instance = get_ai_provider()
