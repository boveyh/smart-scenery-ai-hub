"""快速测试 AI 引擎流式接口"""
import httpx, asyncio, json

async def test():
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.post(
            'http://localhost:8000/api/v1/digitalhuman/chat',
            json={"content": "推荐一条西湖游览路线"},
            headers={"X-Tenant-Id": "west_lake"},
        )
        print(f"Status: {r.status_code}")
        for line in r.text.strip().split('\n'):
            obj = json.loads(line)
            text = obj.get('text_chunk', '')[:80]
            audio = obj.get('audio_url', '')[:60]
            seq = obj.get('seq', '?')
            print(f"  [{seq}] {text} | audio: {audio}")

if __name__ == '__main__':
    asyncio.run(test())