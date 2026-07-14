import asyncio, json, httpx, logging
logging.basicConfig(level=logging.DEBUG)

async def test():
    url = 'http://localhost:8000/api/v1/digitalhuman/chat'
    payload = {'session_id': 'test_dh', 'content': '介绍一下西湖', 'timestamp': 123}
    headers = {'X-Tenant-Id': 'west_lake', 'Content-Type': 'application/json'}

    print(f'POST {url}')
    print(f'Payload: {payload}')

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload, headers=headers)
            print(f'Status: {resp.status_code}')
            print(f'Headers: {dict(resp.headers)}')
            print(f'Body: {resp.text[:500]}')
    except Exception as e:
        print(f'Exception: {type(e).__name__}: {e}')

asyncio.run(test())
