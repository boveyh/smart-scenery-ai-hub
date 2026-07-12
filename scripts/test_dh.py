import asyncio, json, httpx

async def test():
    async with httpx.AsyncClient(timeout=30) as client:
        async with client.stream('POST', 'http://localhost:8000/api/v1/digitalhuman/chat',
            json={'session_id': 'test_dh', 'content': '介绍一下西湖', 'timestamp': 123},
            headers={'X-Tenant-Id': 'west_lake'}
        ) as resp:
            print(f'Status: {resp.status_code}')
            if resp.status_code != 200:
                body = await resp.aread()
                print(f'Body: {body.decode()[:200]}')
                return
            count = 0
            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                data = json.loads(line)
                t = data.get('type')
                s = data.get('seq')
                tc = data.get('text_chunk', '')[:40]
                au = data.get('audio_url', '')
                print(f'  seq={s} type={t} text={tc} audio_url={au}')
                count += 1
                if t in ('end', 'error'):
                    break
            print(f'Total chunks: {count}')

asyncio.run(test())
