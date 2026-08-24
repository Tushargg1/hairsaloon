package com.hairsaloon.auth;

import com.hairsaloon.web.ApiException;
import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Auth failures. Adds nothing to {@link ApiException} beyond convenience
 * constructors; it exists so auth code reads in its own vocabulary.
 */
class AuthException extends ApiException {

    AuthException(HttpStatus status, String code, String message) {
        this(status, code, message, null);
    }

    AuthException(HttpStatus status, String code, String message, Long retryAfterSeconds) {
        super(status, code, message, Map.of(), retryAfterSeconds);
    }
}
