from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from .config import get_settings

async def init_db():
    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_url)
    
    # Import models here to avoid circular imports
    from .models import User, Session, RoleplayEvent, SessionSummary, SystemQuestion
    
    await init_beanie(
        database=client[settings.mongodb_db_name],
        document_models=[
            User,
            Session,
            RoleplayEvent,
            SessionSummary,
            SystemQuestion
        ]
    )
