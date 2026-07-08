from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context
import random
import time
import uuid
import io
import os
import json
import requests
from PIL import Image

app = Flask(__name__, static_folder='static')

# ========== 灵山圣地 · 景区数据 ==========

POIS = [
    {
        'poiId': '1', 'name': '灵山大佛', 'category': '佛教文化',
        'lat': 31.438, 'lng': 120.105,
        'description': '灵山大佛高88米，是举世闻名的青铜大佛。大佛面向太湖，背靠灵山，气势恢宏。游客可登高抱佛脚，感受佛法庄严。大佛所在位置是灵山圣地的核心区域，也是游客必到之处。',
        'crowdedness': 4, 'avgStayMin': 60,
        'openTime': '08:00-17:00', 'ticketPrice': '含景区通票',
        'address': '无锡市滨湖区灵山圣地景区中心',
        'imageUrl': 'https://picsum.photos/400/300?random=10'
    },
    {
        'poiId': '2', 'name': '九龙灌浴', 'category': '佛教文化',
        'lat': 31.435, 'lng': 120.103,
        'description': '九龙灌浴是灵山圣地的标志性景观，每天定时上演震撼的音乐喷泉表演。九条金龙口吐圣水，为佛祖太子沐浴，场面壮观，寓意吉祥。',
        'crowdedness': 5, 'avgStayMin': 30,
        'openTime': '09:00-16:30（整点表演）', 'ticketPrice': '含景区通票',
        'address': '无锡市滨湖区灵山圣地入口广场',
        'imageUrl': 'https://picsum.photos/400/300?random=11'
    },
    {
        'poiId': '3', 'name': '梵宫', 'category': '佛教文化',
        'lat': 31.437, 'lng': 120.106,
        'description': '梵宫是灵山圣地的佛教文化艺术殿堂，内部金碧辉煌，汇集了当代佛教艺术的精华。拥有世界最大的佛教木雕、最精美的佛教壁画，被誉为"东方卢浮宫"。',
        'crowdedness': 3, 'avgStayMin': 90,
        'openTime': '08:30-17:00', 'ticketPrice': '含景区通票',
        'address': '无锡市滨湖区灵山圣地内',
        'imageUrl': 'https://picsum.photos/400/300?random=12'
    },
    {
        'poiId': '4', 'name': '五印坛城', 'category': '佛教文化',
        'lat': 31.439, 'lng': 120.107,
        'description': '五印坛城是藏传佛教风格的建筑，展示了藏式佛教艺术的独特魅力。坛城内供奉着众多佛像和唐卡，是体验藏传佛教文化的重要场所。',
        'crowdedness': 2, 'avgStayMin': 45,
        'openTime': '08:30-16:30', 'ticketPrice': '含景区通票',
        'address': '无锡市滨湖区灵山圣地内',
        'imageUrl': 'https://picsum.photos/400/300?random=13'
    },
    {
        'poiId': '5', 'name': '灵山禅境', 'category': '自然风光',
        'lat': 31.436, 'lng': 120.102,
        'description': '灵山禅境是景区内的园林景观区，以禅意山水为主题。小桥流水、竹林幽径、茶室禅亭，处处体现着"禅"的意境，是放松心灵的好去处。',
        'crowdedness': 2, 'avgStayMin': 45,
        'openTime': '08:00-17:00', 'ticketPrice': '含景区通票',
        'address': '无锡市滨湖区灵山圣地西侧',
        'imageUrl': 'https://picsum.photos/400/300?random=14'
    },
    {
        'poiId': '6', 'name': '灵山素斋馆', 'category': '人文艺术',
        'lat': 31.438, 'lng': 120.104,
        'description': '灵山素斋馆提供精美的佛教素斋，菜品以素食为主，融合江南风味。用餐环境清净雅致，品尝素斋也是灵山之行的一大乐事。',
        'crowdedness': 3, 'avgStayMin': 60,
        'openTime': '11:00-14:00, 17:00-20:00', 'ticketPrice': '人均60-120元',
        'address': '无锡市滨湖区灵山圣地商业街',
        'imageUrl': 'https://picsum.photos/400/300?random=15'
    }
]

# ---------- 工具函数 ----------

def generate_crowdedness_history(poi_id):
    base = random.randint(1, 4)
    return [{'time': f'{i:02d}:00', 'crowdedness': max(1, min(5, base + random.randint(-1, 1)))} for i in range(24)]

# ---------- 路由 ----------

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route('/api/v1/health')
def health():
    return jsonify({'code': 200, 'data': 'ok'})

@app.route('/api/v1/pois')
def get_pois():
    category = request.args.get('category')
    sort = request.args.get('sort')

    data = POIS[:]
    if category and category != '全部':
        data = [p for p in data if p['category'] == category]

    if sort == 'crowdedness':
        data.sort(key=lambda x: x['crowdedness'])

    return jsonify({'code': 200, 'data': data})

@app.route('/api/v1/pois/<poi_id>')
def get_poi_detail(poi_id):
    poi = next((p for p in POIS if p['poiId'] == poi_id), None)
    if not poi:
        return jsonify({'code': 404, 'message': '景点不存在'}), 404
    return jsonify({'code': 200, 'data': poi})

@app.route('/api/v1/pois/batch', methods=['POST'])
def get_pois_batch():
    ids = request.json
    if not ids or not isinstance(ids, list):
        return jsonify({'code': 400, 'message': '参数格式错误，需要提供景点ID列表'}), 400

    data = [p for p in POIS if p['poiId'] in ids]
    return jsonify({'code': 200, 'data': data})

@app.route('/api/v1/route/recommend', methods=['POST'])
def recommend_route():
    prefs = request.json
    if not prefs:
        return jsonify({'code': 400, 'message': '缺少请求参数'}), 400

    interest = prefs.get('interest', '佛教文化')
    pace = prefs.get('pace', 'normal')
    companions = prefs.get('companions', 'alone')
    duration_min = prefs.get('duration_min', 180)

    # 根据兴趣筛选
    filtered = [p for p in POIS if interest in p['category']]
    if not filtered:
        filtered = POIS[:]

    # 根据同行人调整推荐权重
    companion_weights = {
        'alone': {'佛教文化': 1.2, '自然风光': 0.8, '人文艺术': 1.0},
        'couple': {'佛教文化': 1.0, '自然风光': 1.3, '人文艺术': 1.1},
        'with_children': {'佛教文化': 0.8, '自然风光': 1.2, '人文艺术': 0.9}
    }
    weights = companion_weights.get(companions, companion_weights['alone'])

    # 根据节奏调整拥挤度容忍度
    pace_tolerance = {'relaxed': 2, 'normal': 3, 'fast': 5}
    max_crowdedness = pace_tolerance.get(pace, 3)

    # 过滤太拥挤的
    filtered = [p for p in filtered if p['crowdedness'] <= max_crowdedness]
    if not filtered:
        filtered = [p for p in POIS if p['crowdedness'] <= max_crowdedness]
    if not filtered:
        filtered = POIS[:]

    # 按权重评分排序
    def score(poi):
        cat_weight = weights.get(poi['category'], 1.0)
        crowded_factor = 1.0 / (poi['crowdedness'] + 1)
        return cat_weight * crowded_factor

    filtered.sort(key=score, reverse=True)

    # 限制时长
    total_time = 0
    selected = []
    for p in filtered:
        if total_time + p['avgStayMin'] <= duration_min:
            selected.append(p)
            total_time += p['avgStayMin']
    if not selected:
        selected = filtered[:1]

    # 根据节奏调整提示信息
    pace_tips = {
        'relaxed': ['建议在梵宫内细细品味佛教艺术', '可以在灵山禅境品茶静心', '素斋馆的禅意套餐值得一试'],
        'normal': ['建议按推荐顺序游览', '注意九龙灌浴的表演时间', '灵山大佛抱佛脚可祈福'],
        'fast': ['建议重点游览灵山大佛和梵宫', '九龙灌浴演出时间要提前到场', '可选择观光车代步']
    }

    route = {
        'route_id': f'route_{uuid.uuid4().hex[:8]}',
        'poi_sequence': selected,
        'estimated_time_min': total_time,
        'pace': pace,
        'companions': companions,
        'tips': pace_tips.get(pace, pace_tips['normal'])
    }
    return jsonify({'code': 200, 'data': route})

@app.route('/api/v1/info/realtime')
def realtime_info():
    peak_pois = [
        {'poiId': '1', 'name': '灵山大佛', 'crowdedness': 4},
        {'poiId': '2', 'name': '九龙灌浴', 'crowdedness': 5},
        {'poiId': '3', 'name': '梵宫', 'crowdedness': 3}
    ]
    announcements = [
        '今日灵山天气晴朗，适宜游览 🙏',
        '九龙灌浴表演时间：10:00 / 11:30 / 14:00 / 15:30',
        '梵宫地下一层"珍宝馆"新展开放'
    ]

    return jsonify({
        'code': 200,
        'data': {
            'weather': '晴',
            'temperature': random.randint(18, 28),
            'humidity': random.randint(45, 70),
            'windSpeed': random.randint(3, 12),
            'crowdednessLevel': random.randint(2, 4),
            'peakPois': peak_pois,
            'announcements': announcements
        }
    })

@app.route('/api/v1/crowdedness/history/<poi_id>')
def crowdedness_history(poi_id):
    data = generate_crowdedness_history(poi_id)
    return jsonify({'code': 200, 'data': data})

@app.route('/api/v1/crowdedness/latest/<poi_id>')
def crowdedness_latest(poi_id):
    return jsonify({'code': 200, 'data': {'crowdedness': random.randint(1, 5)}})

@app.route('/api/v1/vision/recognize', methods=['POST'])
def recognize_vision():
    image_file = request.files.get('image')
    if not image_file:
        return jsonify({'code': 400, 'message': '缺少图片文件'}), 400

    try:
        img = Image.open(image_file.stream)
        width, height = img.size
        file_format = img.format or 'JPEG'
    except Exception:
        width, height = 400, 300
        file_format = 'JPEG'

    # 灵山圣地特色的识别结果
    objects = ['灵山大佛', '梵宫', '九龙灌浴', '五印坛城', '灵山禅境', '素斋']
    obj = random.choice(objects)
    descriptions = {
        '灵山大佛': '这是灵山圣地标志性的灵山大佛，高88米，面相慈悲庄严。游客可登上佛脚平台抱佛脚，祈求平安吉祥。',
        '梵宫': '这是灵山梵宫，被誉为"东方卢浮宫"。内部有世界最大的佛教木雕和最精美的佛教壁画，是佛教艺术的殿堂。',
        '九龙灌浴': '这是九龙灌浴表演，九条金龙口吐圣水为佛祖太子沐浴。每日定时表演，场面极为壮观震撼。',
        '五印坛城': '这是藏传佛教风格的五印坛城，展示了精美的藏式佛教艺术。坛城内供奉着众多佛像和唐卡。',
        '灵山禅境': '这是灵山禅境园林，以禅意山水为主题，小桥流水、竹林幽径，处处体现"禅"的意境。',
        '素斋': '这是灵山素斋，以素食为主融合江南风味，菜品精致美味，是灵山之行的独特体验。'
    }

    result = {
        'object': obj,
        'confidence': round(random.uniform(0.82, 0.99), 2),
        'description': descriptions.get(obj, '这是灵山圣地的一处美丽景观。'),
        'image_info': {
            'width': width,
            'height': height,
            'format': file_format
        }
    }
    return jsonify({'code': 200, 'data': result})

@app.route('/api/v1/knowledge/offline')
def offline_knowledge():
    knowledge = {
        '厕所在哪里': '灵山大佛两侧、梵宫地下层、商业街均有卫生间',
        '门票多少钱': '灵山圣地通票210元，网上预订有优惠',
        '开放时间': '景区开放时间 08:00-17:00',
        '最佳游览路线': '入口→九龙灌浴→灵山大佛→梵宫→五印坛城→灵山禅境',
        '附近美食': '灵山素斋、无锡小笼包、太湖三白',
        '交通': '无锡火车站乘88/89路公交到灵山圣地站',
        '停车场': '灵山圣地有大型停车场，小车15元/次'
    }
    return jsonify({'code': 200, 'data': knowledge})

# ---------- 流式聊天（对接 DeepSeek API） ----------
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY', '')
DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
SYSTEM_PROMPT = (
    '你是无锡灵山圣地的智能导览助手。灵山圣地位于江苏省无锡市滨湖区，是国家5A级旅游景区，'
    '是以佛教文化为主题的大型景区。你熟悉灵山各景点（灵山大佛、九龙灌浴、梵宫、五印坛城、'
    '灵山禅境、素斋馆等）的历史文化和游览信息。请用简洁热情的中文回答游客问题，'
    '可适当引用佛教文化元素，回答语气温和亲切。'
)

@app.route('/api/v1/chat/stream', methods=['POST'])
def chat_stream():
    def generate():
        msg = request.json.get('content', '') if request.is_json else ''
        msg = msg.strip()
        if not msg:
            yield '{"type":"end","reason":"empty"}\n'
            return

        # 如果没有配置 API Key，降级到模拟回复
        if not DEEPSEEK_API_KEY:
            knowledge = {
                '你好': ['🙏 阿弥陀佛！', '欢迎来到灵山圣地！', '我是您的智能导览助手，', '请问有什么可以帮您的？'],
                '路线': ['为您推荐灵山祈福路线：', '入口→九龙灌浴→灵山大佛→梵宫→五印坛城→灵山禅境', '建议游览时间约3-4小时。'],
                '大佛': ['灵山大佛高88米，', '是世界上最高的青铜大佛之一。', '您可以登高抱佛脚，祈福平安。'],
                '梵宫': ['灵山梵宫被誉为"东方卢浮宫"，', '内部金碧辉煌，', '汇集了当代佛教艺术的精华。'],
                '九龙灌浴': ['九龙灌浴是灵山圣地标志性表演，', '每天10:00/11:30/14:00/15:30定时上演。', '场面壮观，不可错过！'],
                '门票': ['灵山圣地通票210元，', '网上提前预订有优惠。', '包含所有主要景点。'],
                '开放时间': ['景区开放时间：08:00-17:00', '建议上午早点到，游览更从容。'],
                '交通': ['无锡火车站乘88路或89路公交', '直达灵山圣地站，', '车程约50分钟。'],
                '素斋': ['灵山素斋馆提供精美素斋，', '人均60-120元，', '用餐环境清净雅致。'],
                '谢谢': ['不客气！', '祝您在灵山圣地度过美好的时光，', '🙏 福慧双修，吉祥如意！'],
            }
            matched = False
            msg_lower = msg.lower()
            for key, chunks in knowledge.items():
                if key in msg_lower or key in msg:
                    matched = True
                    for chunk in chunks:
                        yield f'{{"type":"text","content":"{chunk}"}}\n'
                        time.sleep(0.2)
                    break
            if not matched:
                for chunk in [f'🙏 您问的是"{msg}"，', '灵山圣地有很多值得一看的景点，', '灵山大佛高耸入云，梵宫金碧辉煌，', '九龙灌浴场面震撼，', '您可以在景点列表中查看详细信息，', '或使用路线推荐功能规划行程。']:
                    yield f'{{"type":"text","content":"{chunk}"}}\n'
                    time.sleep(0.2)
            yield '{"type":"end","reason":"complete"}\n'
            return

        # 调用 DeepSeek 流式 API
        try:
            resp = requests.post(
                DEEPSEEK_API_URL,
                headers={
                    'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream'
                },
                json={
                    'model': 'deepseek-chat',
                    'messages': [
                        {'role': 'system', 'content': SYSTEM_PROMPT},
                        {'role': 'user', 'content': msg}
                    ],
                    'stream': True,
                    'temperature': 0.7,
                    'max_tokens': 2048
                },
                stream=True,
                timeout=30
            )

            if resp.status_code != 200:
                yield f'{{"type":"text","content":"AI服务暂时不可用（{resp.status_code}），请稍后再试。"}}\n'
                yield f'{{"type":"end","reason":"error","code":{resp.status_code}}}\n'
                return

            for line in resp.iter_lines():
                if not line:
                    continue
                line_str = line.decode('utf-8', errors='ignore')
                if not line_str.startswith('data: '):
                    continue
                data_str = line_str[6:].strip()
                if not data_str or data_str == '[DONE]':
                    continue
                try:
                    chunk = json.loads(data_str)
                    delta = chunk.get('choices', [{}])[0].get('delta', {})
                    content = delta.get('content', '')
                    if content:
                        escaped = content.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n').replace('\r', '')
                        yield f'{{"type":"text","content":"{escaped}"}}\n'
                except json.JSONDecodeError:
                    continue

            yield '{"type":"end","reason":"complete"}\n'

        except requests.exceptions.Timeout:
            yield '{"type":"text","content":"请求超时，请稍后重试。"}\n'
            yield '{"type":"end","reason":"timeout"}\n'
        except requests.exceptions.ConnectionError:
            yield '{"type":"text","content":"无法连接AI服务，请检查网络。"}}\n'
            yield '{"type":"end","reason":"connection_error"}\n'
        except Exception as e:
            yield f'{{"type":"text","content":"服务异常：{str(e)}"}}\n'
            yield '{"type":"end","reason":"error"}\n'

    return Response(
        stream_with_context(generate()),
        mimetype='application/x-ndjson',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )

# ---------- SPA 通配路由 ----------
@app.route('/')
@app.route('/<path:path>')
def index(path='index.html'):
    if path and path.startswith('static/'):
        return send_from_directory('static', path[7:])
    return send_from_directory('static', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
