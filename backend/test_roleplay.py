import asyncio
import json
import logging
from app.services.ai_service import ai_provider_instance

logging.basicConfig(level=logging.INFO)

async def main():
    # Load transcript from the provided JSON file
    with open('reflex_training.roleplay_events.json', 'r') as f:
        events = json.load(f)
    
    # Format events into history-like structure for the rater
    # { "role": "user"|"assistant", "content": "..." }
    history = []
    for event in events:
        role = "user" if event["speaker"] == "salesperson" else "assistant"
        # The prompt says: evaluate ONLY the SALESPERSON's performance. 
        # In the AI Provider's history, 'user' is salesperson and 'model/assistant' is customer.
        # Wait, looking at ai_service.py:
        # self.history[session_id].append({"role": "user", "content": f"Salesperson says: {salesperson_message}"})
        # self.history[session_id].append({"role": "model", "content": reply})
        # So salesperson is 'user', client is 'model/assistant'.
        
        history.append({
            "role": "user" if event["speaker"] == "salesperson" else "assistant",
            "content": event["transcript"]
        })
    
    transcript_str = json.dumps(history)
    
    print("Testing Roleplay Rating...")
    res = await ai_provider_instance.rate_session('test_roleplay', transcript_str)
    
    print("\n--- RESULTS ---")
    print(f"Overall Score: {res.overall_score}")
    print(f"Strengths: {res.strengths}")
    print(f"Improvements: {res.improvements}")
    print(f"Performance Debrief: \n{res.performance_debrief}")
    
    with open("test_roleplay_output.json", "w") as f:
        json.dump(res.dict(), f, indent=2)

if __name__ == "__main__":
    asyncio.run(main())
