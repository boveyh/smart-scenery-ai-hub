# -*- coding: utf-8 -*-
import http.client, json, urllib.parse

host = 'localhost:8000'
path = '/api/v1/digitalhuman/chat'
payload = json.dumps({
    'session_id': 'test-complete',
    'content': '介绍一下灵山大佛',
    'tenant_id': 'ling_shan',
    'timestamp': 1700000000000,
}, ensure_ascii=False)

conn = http.client.HTTPConnection(host)
conn.request('POST', path, body=payload.encode('utf-8'), headers={
    'Content-Type': 'application/json',
    'X-Tenant-Id': 'ling_shan',
})

resp = conn.getresponse()
total_text = ''
chunk_count = 0
end_info = None

for raw in resp:
    line = raw.decode('utf-8').strip()
    if line.startswith('data:') or line.startswith('data: '):
        chunk_count += 1
        try:
            js = line[5:].strip()
            data = json.loads(js)
            tc = data.get('text_chunk', '')
            if tc:
                total_text += tc
            if data.get('type') == 'end':
                end_info = data
        except:
            pass

conn.close()

print(f'Total chunks: {chunk_count}')
print(f'Total text chars: {len(total_text)}')
print()
print('=== FULL TEXT ===')
print(total_text if total_text else '(empty)')
print('=== END ===')
if end_info:
    print(f'End: {json.dumps(end_info, ensure_ascii=False)}')
