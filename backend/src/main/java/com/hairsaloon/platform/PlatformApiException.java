package com.hairsaloon.platform;

import java.util.Map;
import org.springframework.http.HttpStatus;

public class PlatformApiException extends RuntimeException {

    private final HttpStatus status;
    private final String code;
    private final Map<String, String> fieldErrors;

    public PlatformApiException(HttpStatus status, String code, String message) {
        this(status, code, message, Map.of());
    }

    public PlatformApiException(HttpStatus status, String code, String message,
                                Map<String, String> fieldErrors) {
        super(message);
        this.status = status;
        this.code = code;
        this.fieldErrors = Map.copyOf(fieldErrors);
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
}
