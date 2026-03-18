import asyncio
import os
import sys

# Add the backend directory to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.services.ai_service import GroqProvider

async def test_decision():
    provider = GroqProvider()
    session_id = "test_decision_session"
    
    print("\n--- Testing Final Decision Logic ---")
    # Simulate a few turns
    await provider.start_conversation(session_id, "elena")
    await provider.reply(session_id, "The BMW X5 is $65,000 and comes in black.")
    
    # Trigger final decision
    print("Requesting final decision...")
    reply, _ = await provider.reply(session_id, "Is that a deal then?", is_final=True)
    print(f"Final Reply: {reply}")
    
    if "BUY" in reply.upper() or "NOT BUY" in reply.upper():
        print("SUCCESS: Decision detected in final reply.")
    else:
        print("WARNING: No explicit decision (BUY/NOT BUY) detected in reply.")

async def test_history_optimization():
    provider = GroqProvider()
    session_id = "test_history_session"
    
    print("\n--- Testing History Optimization ---")
    await provider.start_conversation(session_id, "robert")
    
    # Add many messages to trigger optimization (> 6 turns)
    for i in range(8):
        await provider.reply(session_id, f"Performance spec {i} is excellent.")
    
    history = provider.history[session_id]
    print(f"Total history messages: {len(history)}")
    
    # This shouldn't crash and should still give a coherent reply
    reply, _ = await provider.reply(session_id, "What about the pricing?")
    print(f"Optimized Reply: {reply}")
    print("SUCCESS: History optimization didn't break basic flow.")

if __name__ == "__main__":
    asyncio.run(test_decision())
    asyncio.run(test_history_optimization())
