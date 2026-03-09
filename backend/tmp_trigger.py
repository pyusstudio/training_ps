import asyncio
from dotenv import load_dotenv

load_dotenv("c:/Node Projects/ReflexTraining/backend/.env")

from app.services.ai_service import HuggingFaceProvider

async def test():
    provider = HuggingFaceProvider()
    print("Testing start_conversation...")
    try:
        reply = await provider.start_conversation("test-session")
        print("Reply:", reply)
    except Exception as e:
        import traceback
        traceback.print_exc()

    print("\nTesting rate_session...")
    try:
        rating = await provider.rate_session("test-session", "System: hello\nUser: hi")
        print("Rating:", rating)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
