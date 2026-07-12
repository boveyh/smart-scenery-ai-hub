import asyncio, json
import websockets

async def test_ws():
    uri = 'ws://localhost:9000/ws/chat?tenant_id=west_lake&session_id=test_001&mode=text'
    async with websockets.connect(uri) as ws:
        msg = json.dumps({'action': 'send_message', 'content': '西湖有哪些景点？', 'timestamp': 123})
        await ws.send(msg)
        print('Sent: 西湖有哪些景点？')
        for i in range(5):
            try:
                resp = await asyncio.wait_for(ws.recv(), timeout=5)
                data = json.loads(resp)
                t = data.get('type')
                c = data.get('content', '')
                print(f'  Received: type={t}, content={c[:60]}')
                if t == 'end':
                    print(f'  Usage: {data.get("usage")}')
                    break
            except asyncio.TimeoutError:
                print('  Timeout')
                break

asyncio.run(test_ws())
