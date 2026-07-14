import asyncio, json
import httpx

async def test():
    url = 'http://localhost:8000/api/v1/digitalhuman/chat'
    payload = {'session_id': 'debug_test', 'content': '断桥残雪的故事', 'timestamp': 123}
    headers = {'X-Tenant-Id': 'west_lake', 'Content-Type': 'application/json'}

    async with httpx.AsyncClient(timeout=30) as client:
        async with client.stream('POST', url, json=payload, headers=headers) as resp:
            print(f'Status: {resp.status_code}')
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                data = json.loads(line)
                print(f'seq={data.get("seq")} type={data.get("type")} text={data.get("text_chunk","")[:30]} audio={data.get("audio_url","")}')
                if data.get('type') in ('end', 'error'):
                    break

asyncio.run(test())
