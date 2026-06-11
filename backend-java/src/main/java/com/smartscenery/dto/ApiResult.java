package com.smartscenery.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResult<T> {

    private int code;
    private String message;
    private T data;

    public static <T> ApiResult<T> success(T data) {
        return new ApiResult<>(200, "success", data);
    }

    public static <T> ApiResult<T> success() {
        return new ApiResult<>(200, "success", null);
    }

    public static <T> ApiResult<T> error(int code, String message) {
        return new ApiResult<>(code, message, null);
    }

    public static <T> ApiResult<T> error(int code, String message, T data) {
        return new ApiResult<>(code, message, data);
    }

    // ─── 预制错误码 ─────────────────────────────────────
    public static <T> ApiResult<T> badRequest(String message) {
        return error(400, message);
    }

    public static <T> ApiResult<T> unauthorized(String message) {
        return error(401, message);
    }

    public static <T> ApiResult<T> tooManyRequests() {
        return error(429, "请求过快，请稍后再试");
    }

    public static <T> ApiResult<T> serverError(String message) {
        return error(500, message);
    }

    public static <T> ApiResult<T> serviceUnavailable(String message) {
        return error(503, message);
    }
}
