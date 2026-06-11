package com.smartscenery.exception;

import lombok.Getter;

/**
 * 业务异常，对应 API 文档 §7 错误码
 */
@Getter
public class BusinessException extends RuntimeException {

    private final int code;

    public BusinessException(int code, String message) {
        super(message);
        this.code = code;
    }

    public static BusinessException badRequest(String message) {
        return new BusinessException(400, message);
    }

    public static BusinessEntityException sensitiveWord() {
        return new BusinessEntityException(400, "内容包含敏感词，请重新输入");
    }

    public static BusinessException unauthorized(String message) {
        return new BusinessException(401, message);
    }

    public static BusinessException tooManyRequests() {
        return new BusinessException(429, "请求过快，请稍后再试");
    }

    public static BusinessException notFound(String message) {
        return new BusinessException(404, message);
    }
}
