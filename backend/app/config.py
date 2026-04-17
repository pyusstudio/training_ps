from functools import lru_cache
from typing import List, Optional

from pydantic import AnyUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Reflex Training Backend"
    debug: bool = True

    # Database
    mongodb_url: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "reflex_training"

    # Security
    jwt_secret_key: str = "CHANGE_ME_IN_PROD"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS / Frontends
    cors_origins: List[AnyUrl] = []

    # AI Conversation Providers
    ai_provider: str = "gemini"  # gemini | openai | huggingface | ollama
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    huggingface_api_key: Optional[str] = None
    huggingface_model: str = "meta-llama/Llama-3.1-8B-Instruct"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    
    # Groq AI Provider
    groq_api_key: Optional[str] = None
    groq_model: str = "llama-3.1-8b-instant"
    
    session_time_limit_seconds: int = 180  # 3 minutes

    # Performance & Concurrency Limits
    llm_reply_timeout_seconds: float = 15.0
    llm_rate_timeout_seconds: float = 60.0
    ws_queue_max_size: int = 50

    # Whisper / STT backup
    whisper_api_key: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()

