import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws?role=unity"
    print("Connecting to ws server...")
    try:
        async with websockets.connect(uri) as ws:
            resp = await ws.recv()
            print("Received handshake:", resp)
            
            # Request start session
            req = {
                "type": "session_start",
                "direction": "cs",
                "source": "unity",
                "persona_id": "elena",
            }
            await ws.send(json.dumps(req))
            resp2 = await ws.recv()
            print("Received session_started:", resp2)
            
            msg2 = json.loads(resp2)
            if msg2["type"] == "session_started":
                session_id = msg2.get("session_id")
                print(f"Got Session ID: {session_id}")
                
                # Bombard it to test finalize_session
                print("Sending 5 end commands instantaneously...")
                end_req = {
                    "type": "session_end",
                    "direction": "cs",
                    "session_id": session_id,
                }
                for i in range(5):
                    await ws.send(json.dumps(end_req))
                    
                await asyncio.sleep(2)
                
    except Exception as e:
        print("Error:", e)
        raise
        
if __name__ == "__main__":
    asyncio.run(test_websocket())
