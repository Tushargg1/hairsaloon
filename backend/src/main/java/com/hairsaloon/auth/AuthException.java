package com.hairsaloon.auth;

import org.springframework.http.HttpStatus;

class AuthException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final Long retryAfterSeconds;

    AuthException(HttpStatus status, String code, String message) {
        this(status, code, message, null);
    }

    AuthException(HttpStatus status, String code, String message, Long retryAfterSeconds) {
        super(message);
        this.status = status;
        this.code = code;
        this.retryAfterSeconds = retryAfterSeconds;
    }

    HttpStatus status() {
        return status;
    }

    String code() {
        return code;
    }

    Long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
