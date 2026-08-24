package com.hairsaloon.web;

import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Base type for every deliberate API failure. Carries the full error contract so a
 * single handler can render any of them: status, machine-readable code, per-field
 * messages, and an optional Retry-After hint for rate-limited responses.
 */
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final Map<String, String> fieldErrors;
    private final Long retryAfterSeconds;

    public ApiException(HttpStatus status, String code, String message,
                        Map<String, String> fieldErrors, Long retryAfterSeconds) {
        super(message);
        this.status = status;
        this.code = code;
        this.fieldErrors = Map.copyOf(fieldErrors);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return code;
    }

    public Map<String, String> fieldErrors() {
        return fieldErrors;
    }

    public Long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
