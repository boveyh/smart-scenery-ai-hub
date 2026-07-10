// ========== 灵山圣地 · 智慧景区导览 ==========

// ---------- 全局状态 ----------
let currentPage = 'home';
let currentChatMode = 'text';
let currentPoiId = null;
let selectedImage = null;

// ---------- 导航 ----------
function navigateTo(page, mode) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + page);
    if (target) {
        target.classList.add('active');
        currentPage = page;
    }
    // 高亮底部tab
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    const tab = document.querySelector(`.tab-item[data-page="${page}"]`);
    if (tab) tab.classList.add('active');
    // 页面标题
    const titles = {
        home: '灵山圣地·智慧导览',
        chat: 'AI 导览',
        pois: '景点列表',
        'poi-detail': '景点详情',
        route: '路线推荐',
        realtime: '实时资讯',
        scan: '拍照识别'
    };
    document.getElementById('pageTitle').textContent = titles[page] || '灵山圣地·智慧导览';
    // 页面数据加载
    if (page === 'pois') loadPOIs();
    if (page === 'realtime') loadRealtime();
    if (page === 'chat') {
        if (mode) switchChatMode(mode);
    }
    if (page === 'poi-detail' && currentPoiId) loadPoiDetail(currentPoiId);
}

// ---------- API 调用 ----------
const API_BASE = '/api/v1';
async function fetchAPI(url, options = {}) {
    const res = await fetch(API_BASE + url, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    });
    const data = await res.json();
    if (data.code === 200) return data.data;
    throw new Error(data.message || '请求失败');
}

// ---------- 景点列表 ----------
async function loadPOIs() {
    try {
        const category = document.getElementById('categoryFilter').value;
        const sort = document.getElementById('sortFilter').value;
        let params = new URLSearchParams();
        if (category !== '全部') params.append('category', category);
        const url = '/pois' + (params.toString() ? '?' + params.toString() : '');
        const data = await fetchAPI(url);
        // 排序
        if (sort === 'crowdedness') data.sort((a,b) => a.crowdedness - b.crowdedness);
        renderPOIs(data);
    } catch (e) {
        console.error(e);
        document.getElementById('poiList').innerHTML = '<p style="color:white;text-align:center;padding:20px;">加载失败，请稍后重试</p>';
    }
}
function renderPOIs(pois) {
    const container = document.getElementById('poiList');
    container.innerHTML = pois.map(p => `
        <div class="poi-card" onclick="showPoiDetail('${p.poiId}')">
            <img src="${p.imageUrl || 'https://picsum.photos/100/80?random='+p.poiId}" alt="">
            <div class="poi-info">
                <div class="poi-name">${p.name}</div>
                <div class="poi-meta">${p.category} · 拥挤度 ${'⭐'.repeat(p.crowdedness)}${'☆'.repeat(5-p.crowdedness)}</div>
                <div class="poi-meta">${p.description ? p.description.substring(0, 30) + '...' : ''}</div>
            </div>
        </div>
    `).join('');
}

// ---------- 景点详情 ----------
async function showPoiDetail(poiId) {
    currentPoiId = poiId;
    navigateTo('poi-detail');
    await loadPoiDetail(poiId);
}
async function loadPoiDetail(poiId) {
    try {
        const poi = await fetchAPI(`/pois/${poiId}`);
        const container = document.getElementById('poiDetail');
        container.innerHTML = `
            <img src="${poi.imageUrl || 'https://picsum.photos/400/200?random='+poi.poiId}" alt="">
            <div class="name">${poi.name}</div>
            <div class="info">📂 分类：${poi.category}</div>
            <div class="info">🕐 开放时间：${poi.openTime || '08:00-17:00'}</div>
            <div class="info">💰 门票：${poi.ticketPrice || '景区通票包含'}</div>
            <div class="info">📍 地址：${poi.address || '无锡灵山圣地景区内'}</div>
            <div class="info">👥 当前拥挤度：${'⭐'.repeat(poi.crowdedness)}${'☆'.repeat(5-poi.crowdedness)}</div>
            <div style="margin-top:16px;line-height:1.8;font-size:15px;color:var(--text-primary);">${poi.description}</div>
            <button onclick="navigateTo('route')">🗺️ 推荐路线</button>
        `;
    } catch (e) {
        console.error(e);
        document.getElementById('poiDetail').innerHTML = '<p style="text-align:center;padding:20px;">加载失败</p>';
    }
}

// ---------- 路线推荐 ----------
async function generateRoute() {
    const interest = document.getElementById('routeInterest').value;
    const pace = document.getElementById('routePace').value;
    const companions = document.getElementById('routeCompanion').value;
    const duration_min = parseInt(document.getElementById('routeDuration').value);
    try {
        const route = await fetchAPI('/route/recommend', {
            method: 'POST',
            body: JSON.stringify({ interest, pace, companions, duration_min })
        });
        const container = document.getElementById('routeResult');
        container.innerHTML = `
            <h3 style="margin-bottom:12px;">🙏 推荐祈福路线</h3>
            ${route.poi_sequence.map((p, i) => `
                <div class="step">
                    <span class="idx">${i+1}</span>
                    <div>
                        <strong style="font-size:16px;">${p.name}</strong>
                        <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">⏱️ 建议停留 ${p.avgStayMin} 分钟</div>
                    </div>
                </div>
            `).join('')}
            <div style="margin-top:16px;padding:12px;background:rgba(102,126,234,0.08);border-radius:12px;">
                <div style="font-weight:700;font-size:16px;">⏱️ 总时长：约 ${route.estimated_time_min} 分钟</div>
                ${route.tips.map(t => '<div style="margin-top:6px;">💡 ' + t + '</div>').join('')}
            </div>
        `;
    } catch (e) {
        console.error(e);
        document.getElementById('routeResult').innerHTML = '<p style="text-align:center;padding:20px;">生成失败，请稍后重试</p>';
    }
}

// ---------- 实时资讯 ----------
async function loadRealtime() {
    try {
        const info = await fetchAPI('/info/realtime');
        const container = document.getElementById('realtimeInfo');
        container.innerHTML = `
            <div class="weather-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <div>
                        <div class="weather-temp">${info.temperature}°C</div>
                        <div style="font-size:15px;opacity:0.9;">${info.weather} · 湿度 ${info.humidity}%</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:14px;opacity:0.8;">🍃 风速 ${info.windSpeed} km/h</div>
                        <div style="font-size:14px;opacity:0.8;margin-top:4px;">👥 整体拥挤度 ${info.crowdednessLevel}/5</div>
                    </div>
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <div class="section-title" style="color:var(--text-primary);margin-top:0;text-shadow:none;">热门景点拥挤度</div>
                ${info.peakPois.map(p => `
                    <div class="bar-item">
                        <span>${p.name}</span>
                        <div class="bar-bg"><div class="bar-fill" style="width:${p.crowdedness/5*100}%;"></div></div>
                        <span>${p.crowdedness}/5</span>
                    </div>
                `).join('')}
            </div>
            <div>
                <div class="section-title" style="color:var(--text-primary);margin-top:0;text-shadow:none;">📢 景区公告</div>
                ${info.announcements.map(a => `<div style="background:rgba(102,126,234,0.06);padding:10px 14px;border-radius:10px;margin:6px 0;font-size:14px;">${a}</div>`).join('')}
            </div>
        `;
    } catch (e) {
        console.error(e);
        document.getElementById('realtimeInfo').innerHTML = '<p style="text-align:center;padding:20px;">加载失败</p>';
    }
}

// ---------- 聊天 ----------
function switchChatMode(mode) {
    currentChatMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');
    // 切换模式时保留欢迎语
    const msgList = document.getElementById('chatMessages');
    msgList.innerHTML = '<div class="msg assistant welcome-msg">🙏 欢迎来到灵山圣地！我是您的智能导览助手，可以为您介绍景点、推荐路线、解答问题。请问有什么可以帮您的？</div>';
}
async function sendChat() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    // 显示用户消息
    const container = document.getElementById('chatMessages');
    container.innerHTML += `<div class="msg user">${text}</div>`;
    container.scrollTop = container.scrollHeight;
    // 流式聊天
    if (currentChatMode === 'text') {
        try {
            const response = await fetch('/api/v1/chat/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: text })
            });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let done = false;
            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunk = decoder.decode(value || new Uint8Array(), { stream: true });
                buffer += chunk;
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (let line of lines) {
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);
                            if (data.type === 'text') {
                                const last = container.lastElementChild;
                                if (last && last.classList.contains('msg') && last.classList.contains('assistant') && !last.classList.contains('welcome-msg')) {
                                    last.textContent += data.content;
                                } else {
                                    const msgDiv = document.createElement('div');
                                    msgDiv.className = 'msg assistant';
                                    msgDiv.textContent = data.content;
                                    container.appendChild(msgDiv);
                                }
                                container.scrollTop = container.scrollHeight;
                            }
                        } catch (e) {}
                    }
                }
            }
        } catch (e) {
            console.error(e);
            container.innerHTML += `<div class="msg assistant">网络异常，请稍后重试</div>`;
        }
    } else {
        // 数字人模式模拟
        container.innerHTML += `<div class="msg assistant">🧘 数字人正在冥想思考...</div>`;
        setTimeout(() => {
            container.innerHTML += `<div class="msg assistant">🙏 施主您好，灵山圣地乃佛教文化圣地，建议您参观灵山大佛、九龙灌浴等经典景点，感受佛国净土的庄严与祥和。</div>`;
            container.scrollTop = container.scrollHeight;
        }, 1000);
    }
}

// ---------- 拍照识别 ----------
function takePhoto() {
    if (!navigator.mediaDevices) {
        alert('当前浏览器不支持摄像头');
        return;
    }
    navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.onloadedmetadata = () => {
                video.play();
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                stream.getTracks().forEach(t => t.stop());
                const dataUrl = canvas.toDataURL('image/jpeg');
                selectedImage = dataUrl;
                document.getElementById('scanImage').src = dataUrl;
                document.getElementById('scanImage').style.display = 'block';
                recognizeImage(dataUrl);
            };
            video.onerror = () => alert('摄像头启动失败');
        })
        .catch(err => alert('无法访问摄像头: ' + err.message));
}
function chooseImage() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const dataUrl = ev.target.result;
                selectedImage = dataUrl;
                document.getElementById('scanImage').src = dataUrl;
                document.getElementById('scanImage').style.display = 'block';
                recognizeImage(dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}
async function recognizeImage(imageData) {
    const scanResult = document.getElementById('scanResult');
    scanResult.innerHTML = '🔍 正在识别灵山胜景...';
    try {
        const formData = new FormData();
        const blob = dataURLtoBlob(imageData);
        formData.append('image', blob, 'photo.jpg');
        const res = await fetch(API_BASE + '/vision/recognize', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.code === 200) {
            scanResult.innerHTML = `
                <div style="font-weight:700;margin-bottom:8px;">🙏 识别结果</div>
                <div>🏷️ <strong>${data.data.object}</strong>（可信度 ${(data.data.confidence * 100).toFixed(0)}%）</div>
                <div style="margin-top:8px;line-height:1.8;">${data.data.description}</div>
            `;
        } else {
            scanResult.innerHTML = '识别失败，请重试';
        }
    } catch (e) {
        console.error(e);
        scanResult.innerHTML = '识别失败，请重试';
    }
}
function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
}
function askQuestion() {
    const question = document.getElementById('scanQuestion').value.trim();
    if (!question) return alert('请输入问题');
    document.getElementById('scanResult').innerHTML += `<div style="margin-top:8px;padding:8px;background:rgba(102,126,234,0.06);border-radius:8px;">💬 您的问题已收到："${question}"</div>`;
    document.getElementById('scanQuestion').value = '';
}

// ---------- 初始化 ----------
document.addEventListener('DOMContentLoaded', () => {
    navigateTo('home');
});
