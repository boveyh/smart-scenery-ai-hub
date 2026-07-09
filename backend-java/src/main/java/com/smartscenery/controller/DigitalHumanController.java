package com.smartscenery.controller;

import com.smartscenery.util.JsonUtils;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.io.PrintWriter;
import java.util.Map;
import java.util.UUID;

/**
 * 数字人模式流式聊天接口
 *
 * POST /api/v1/digitalhuman/chat
 * Content-Type: application/json
 *
 * 请求体:
 *   { "session_id": "...", "content": "...", "timestamp": 1234567890 }
 *
 * 响应格式: NDJSON (每行一个 JSON 对象)
 *   {"type":"chunk","seq":1,"text_chunk":"你","audio_url":"http://.../audio_1.mp3"}
 *   {"type":"chunk","seq":2,"text_chunk":"好","audio_url":"http://.../audio_2.mp3"}
 *   {"type":"end","reason":"stop","usage":{"prompt_tokens":50,"completion_tokens":120}}
 *   {"type":"error","code":503,"message":"服务不可用"}
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/digitalhuman")
public class DigitalHumanController {

    /**
     * 数字人聊天（流式 NDJSON 响应）
     * 使用 response 直接输出，支持流式返回
     */
    @PostMapping(value = "/chat", produces = MediaType.APPLICATION_JSON_VALUE)
    public void chat(
            @RequestBody Map<String, Object> request,
            HttpServletResponse response) throws IOException {

        String sessionId = (String) request.getOrDefault("session_id", "unknown");
        String content = (String) request.getOrDefault("content", "");
        String tenantId = request.containsKey("tenant_id") ? (String) request.get("tenant_id") : null;

        log.info("[DH] 数字人请求: session={}, tenant={}, content={}", sessionId, tenantId, content);

        if (content == null || content.isBlank()) {
            sendErrorJson(response, 400, "消息内容不能为空");
            return;
        }

        // 设置流式响应头
        response.setContentType("application/x-ndjson");
        response.setCharacterEncoding("UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");
        response.setHeader("X-Accel-Buffering", "no");

        PrintWriter writer = response.getWriter();

        try {
            // 模拟数字人回复：逐步输出文本分片（含模拟音频 URL）
            String[] chunks = generateReplyChunks(content);

            for (int i = 0; i < chunks.length; i++) {
                String textChunk = chunks[i];
                int seq = i + 1;

                // 模拟音频 URL（实际应调用 TTS 服务生成）
                String audioUrl = String.format("http://audio.example.com/tts/%s_%d.mp3",
                        UUID.randomUUID().toString().substring(0, 8), seq);

                Map<String, Object> chunkData = Map.of(
                        "type", "chunk",
                        "seq", seq,
                        "text_chunk", textChunk,
                        "audio_url", audioUrl
                );

                writer.write(JsonUtils.toJson(chunkData));
                writer.write("\n");
                writer.flush();

                // 模拟流式输出间隔
                try {
                    Thread.sleep(200);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }

            // 发送结束标记
            Map<String, Object> endData = Map.of(
                    "type", "end",
                    "reason", "stop",
                    "usage", Map.of(
                            "prompt_tokens", 50,
                            "completion_tokens", chunks.length * 15,
                            "total_tokens", 50 + chunks.length * 15
                    )
            );
            writer.write(JsonUtils.toJson(endData));
            writer.write("\n");
            writer.flush();

            log.info("[DH] 回复完成: session={}, chunks={}", sessionId, chunks.length);

        } catch (Exception e) {
            log.error("[DH] 流式输出异常: session={}", sessionId, e);
            sendErrorJson(response, 500, "服务处理异常");
        }
    }

    /**
     * 生成模拟回复文本分片
     */
    private String[] generateReplyChunks(String userInput) {
        return new String[]{
                "您提到的是关于「" + userInput + "」的问题。\n",
                "根据景区知识库的信息，\n",
                "我来为您详细介绍一下：\n\n",
                "西湖位于浙江省杭州市，\n",
                "是国家5A级旅游景区，\n",
                "也是世界文化遗产。\n\n",
                "景区内包含了苏堤春晓、\n",
                "断桥残雪、雷峰夕照等\n",
                "著名的西湖十景。\n\n",
                "建议您安排3-4小时的游览时间，\n",
                "最佳季节是春季和秋季。\n\n",
                "如果您需要更多帮助，\n",
                "请随时告诉我！"
        };
    }

    /**
     * 发送错误 JSON 响应
     */
    private void sendErrorJson(HttpServletResponse response, int code, String message) throws IOException {
        try {
            String json = JsonUtils.toJson(Map.of(
                    "type", "error",
                    "code", code,
                    "message", message
            ));
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write(json);
        } catch (Exception e) {
            log.error("发送错误响应失败", e);
        }
    }
}
