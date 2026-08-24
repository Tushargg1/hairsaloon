package com.hairsaloon.platform;

import com.hairsaloon.web.ApiException;
import java.util.Map;
import org.springframework.http.HttpStatus;

/**
 * Platform and tenant-data failures. Adds nothing to {@link ApiException} beyond
 * convenience constructors for the common field-error cases.
 */
public class PlatformApiException extends ApiException {

    public PlatformApiException(HttpStatus status, String code, String message) {
        this(status, code, message, Map.of());
    }

    public PlatformApiException(HttpStatus status, String code, String message,
                                Map<String, String> fieldErrors) {
        super(status, code, message, fieldErrors, null);
    }
}
