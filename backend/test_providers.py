import asyncio
import os
import sys

# Add the backend directory to the path so we can import app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.services.ai_service import GeminiProvider, GroqProvider
from app.config import get_settings

async def test_provider(provider, name):
    print(f"\n--- Testing {name} ---")
    try:
        # Test start_conversation
        print(f"[{name}] Starting conversation...")
        opening, q_id = await provider.start_conversation("test_session", "elena")
        print(f"[{name}] Opening: {opening}")
        
        # Test reply
        print(f"[{name}] Sending reply...")
        reply, q_id = await provider.reply("test_session", "I'm looking for a BMW X5.")
        print(f"[{name}] Reply: {reply}")
        
        # Test evaluation
        print(f"[{name}] Evaluating reply...")
        eval_res = await provider.evaluate_reply("test_session", "I'm looking for a BMW X5.")
        print(f"[{name}] Evaluation: Empathy={eval_res.empathy}, Detail={eval_res.detail}")
        
        print(f"[{name}] SUCCESS")
    except Exception as e:
        print(f"[{name}] FAILED: {e}")
        import traceback
        traceback.print_exc()

async def main():
    settings = get_settings()
    print(f"Current AI Provider in config: {settings.ai_provider}")
    
    # Test Groq
    if settings.groq_api_key and settings.groq_api_key != "your_groq_api_key_here":
        await test_provider(GroqProvider(), "Groq")
    else:
        print("\n[Groq] Skipped: GROQ_API_KEY not set in .env")
        
    # Test Gemini
    if settings.gemini_api_key and settings.gemini_api_key != "your_gemini_api_key_here":
        await test_provider(GeminiProvider(), "Gemini")
    else:
        print("\n[Gemini] Skipped: GEMINI_API_KEY not set in .env")

if __name__ == "__main__":
    asyncio.run(main())
