package com.smartscenery.exception;

import lombok.Getter;

/**
 * 业务实体异常 — 与敏感词等实体层面的业务校验相关
 */
@Getter
public class BusinessEntityException extends BusinessException {

    public BusinessEntityException(int code, String message) {
        super(code, message);
    }
}
