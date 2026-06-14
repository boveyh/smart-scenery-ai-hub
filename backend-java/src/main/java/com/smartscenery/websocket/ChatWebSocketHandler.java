package com.smartscenery.websocket;

import com.smartscenery.util.JsonUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * 极速文本模式 WebSocket 聊天处理器
 *
 * 协议：NDJSON 流式
 * - 客户端发送：{"action":"send_message","content":"...","timestamp":...}
 * - 心跳：{"action":"heartbeat","timestamp":...}
 * - 服务端回复：逐行 NDJSON
 *   {"type":"text","content":"...","seq":1}
 *   {"type":"text","content":"...","seq":2}
 *   {"type":"end","reason":"stop","usage":{"prompt_tokens":50,"completion_tokens":100}}
 *   {"type":"error","code":503,"message":"服务不可用"}
 */
@Slf4j
@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    /** 在线会话数统计 */
    private static final AtomicInteger ONLINE_COUNT = new AtomicInteger(0);

    /** 所有活跃会话 <sessionId, WebSocketSession> */
    private static final Map<String, WebSocketSession> SESSIONS = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String sessionId = extractParam(session, "session_id");
        String tenantId = extractParam(session, "tenant_id");

        if (sessionId == null) {
            sessionId = "anon_" + session.getId();
        }

        session.getAttributes().put("session_id", sessionId);
        session.getAttributes().put("tenant_id", tenantId != null ? tenantId : "default");

        SESSIONS.put(sessionId, session);
        int count = ONLINE_COUNT.incrementAndGet();

        log.info("[WS] 连接建立: session={}, tenant={}, 在线数={}", sessionId, tenantId, count);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload();
        String sessionId = (String) session.getAttributes().get("session_id");
        String tenantId = (String) session.getAttributes().get("tenant_id");

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> msg = JsonUtils.fromJson(payload, Map.class);
            if (msg == null) {
                sendError(session, 400, "消息格式错误");
                return;
            }

            String action = (String) msg.getOrDefault("action", "");

            switch (action) {
                case "send_message" -> handleSendMessage(session, sessionId, tenantId, msg);
                case "heartbeat" -> handleHeartbeat(session);
                default -> sendError(session, 400, "未知 action: " + action);
            }
        } catch (Exception e) {
            log.error("[WS] 消息处理失败: session={}, error={}", sessionId, e.getMessage());
            sendError(session, 500, "服务处理异常");
        }
    }

    /**
     * 处理用户发送的消息
     */
    private void handleSendMessage(WebSocketSession session, String sessionId, String tenantId,
                                   Map<String, Object> msg) {
        String content = (String) msg.getOrDefault("content", "");
        if (content.isBlank()) {
            sendError(session, 400, "消息内容不能为空");
            return;
        }

        log.info("[WS] 收到消息: session={}, tenant={}, content={}", sessionId, tenantId, content);

        // 模拟 AI 回复（分多个分片流式返回）
        // 实际生产中应调用 AI 引擎 RAG 服务
        sendTextChunk(session, "您好！您询问的是关于「" + content + "」的问题。", 1);
        sendTextChunk(session, "根据景区知识库，我为您找到以下相关信息：\n\n", 2);
        sendTextChunk(session, "西湖是杭州著名的风景名胜区，被列入《世界遗产名录》。\n包括苏堤春晓、断桥残雪等十景。", 3);
        sendEnd(session, "stop", mockUsage());
    }

    /**
     * 处理心跳
     */
    private void handleHeartbeat(WebSocketSession session) {
        try {
            session.sendMessage(new TextMessage("{\"type\":\"pong\"}"));
        } catch (IOException e) {
            log.warn("[WS] 心跳响应失败: {}", e.getMessage());
        }
    }

    /**
     * 发送文本分片
     */
    private void sendTextChunk(WebSocketSession session, String content, int seq) {
        try {
            String json = JsonUtils.toJson(Map.of(
                    "type", "text",
                    "content", content,
                    "seq", seq
            ));
            session.sendMessage(new TextMessage(json));
        } catch (IOException e) {
            log.error("[WS] 发送文本分片失败: seq={}", seq, e);
        }
    }

    /**
     * 发送对话结束标记
     */
    private void sendEnd(WebSocketSession session, String reason, Map<String, Object> usage) {
        try {
            String json = JsonUtils.toJson(Map.of(
                    "type", "end",
                    "reason", reason,
                    "usage", usage
            ));
            session.sendMessage(new TextMessage(json));
        } catch (IOException e) {
            log.error("[WS] 发送结束标记失败", e);
        }
    }

    /**
     * 发送错误消息
     */
    private void sendError(WebSocketSession session, int code, String message) {
        try {
            String json = JsonUtils.toJson(Map.of(
                    "type", "error",
                    "code", code,
                    "message", message
            ));
            session.sendMessage(new TextMessage(json));
        } catch (IOException e) {
            log.error("[WS] 发送错误消息失败", e);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String sessionId = (String) session.getAttributes().get("session_id");
        if (sessionId != null) {
            SESSIONS.remove(sessionId);
        }
        int count = ONLINE_COUNT.decrementAndGet();
        log.info("[WS] 连接关闭: session={}, status={}, 在线数={}", sessionId, status, count);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("[WS] 传输错误: session={}, error={}",
                session.getAttributes().get("session_id"), exception.getMessage());
    }

    // ==================== 辅助方法 ====================

    private String extractParam(WebSocketSession session, String name) {
        URI uri = session.getUri();
        if (uri == null) return null;
        String query = uri.getQuery();
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] parts = param.split("=", 2);
            if (parts.length == 2 && parts[0].equals(name)) {
                return parts[1];
            }
        }
        return null;
    }

    private Map<String, Object> mockUsage() {
        return Map.of(
                "prompt_tokens", 50,
                "completion_tokens", 120,
                "total_tokens", 170
        );
    }

    /** 获取在线会话数 */
    public static int getOnlineCount() {
        return ONLINE_COUNT.get();
    }
}
