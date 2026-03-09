import asyncio
from huggingface_hub import AsyncInferenceClient
import os
from dotenv import load_dotenv

load_dotenv("c:/Node Projects/ReflexTraining/backend/.env")

SYSTEM_PROMPT = """You are a potential car buyer visiting a dealership. 
You are speaking with a salesperson (the user).
Your role is to act naturally as a customer. 
You are slightly skeptical but genuinely interested in buying a car if the conditions are right.
Keep your responses relatively short (1-3 sentences) as this is a spoken conversation.
Do NOT break character or acknowledge you are an AI.
"""

async def test():
    client = AsyncInferenceClient(token=os.getenv("HUGGINGFACE_API_KEY"))
    try:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "Act as the customer. Look at the context and initiate the conversation naturally. Keep your response to 1-2 realistic sentences."}
        ]
        res = await client.chat_completion(
            model='meta-llama/Llama-3.1-8B-Instruct', 
            messages=messages,
            max_tokens=150,
            temperature=0.7
        )
        print("Response:", res)
        print("Choices:", res.choices)
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(test())
