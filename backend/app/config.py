from functools import lru_cache
from typing import List, Optional

from pydantic import AnyUrl
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Reflex Training Backend"
    debug: bool = True

    # Database
    sqlite_path: str = "reflex.db"

    # Security
    jwt_secret_key: str = "CHANGE_ME_IN_PROD"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # CORS / Frontends
    cors_origins: List[AnyUrl] = []

    # AI / ML
    sbert_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    use_learning_model: bool = False
    learning_model_path: Optional[str] = None

    # AI Conversation Providers
    ai_provider: str = "gemini"  # gemini | openai | huggingface | ollama
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    huggingface_api_key: Optional[str] = None
    huggingface_model: str = "meta-llama/Llama-3.1-8B-Instruct"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    
    session_time_limit_seconds: int = 180  # 3 minutes

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

