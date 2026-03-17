import sys
import os

# Add the project root to sys.path
sys.path.append(r'c:\Node Projects\ReflexTraining\backend')

from app.services.ai_service import get_system_prompt

def test_prompt():
    personas = ["elena", "ahmad", "sarah", "david"]
    for p in personas:
        print(f"\n--- Prompt for {p.upper()} ---")
        prompt = get_system_prompt(p)
        print(prompt)
        assert "Nissan Magnite Tekna Launch Edition" in prompt
        assert "Dubai" in prompt
        assert "Pricing:" in prompt
        assert "Insurance:" in prompt
        assert "On-road/Off-road Pricing:" in prompt
        assert "STRICT BEHAVIORAL GUARDRAILS (NO JAILBREAK):" in prompt
        assert "NEVER acknowledge you are an AI" in prompt

if __name__ == "__main__":
    try:
        test_prompt()
        print("\nVerification SUCCESS: Pricing, Insurance, and Security guardrails are present in all prompts.")
    except Exception as e:
        print(f"\nVerification FAILED: {e}")
