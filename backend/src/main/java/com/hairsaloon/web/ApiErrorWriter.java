package com.hairsaloon.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

/**
 * Writes {@link ApiError} bodies from the points that run outside the
 * {@code @RestControllerAdvice}: Spring Security's entry point / access-denied hooks
 * and the tenant-resolution filter.
 */
@Component
public class ApiErrorWriter {

    private final ObjectMapper objectMapper;

    public ApiErrorWriter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void unauthorized(HttpServletResponse response) throws IOException {
        write(response, 401, ApiError.of("UNAUTHORIZED", "Authentication is required"));
    }

    public void forbidden(HttpServletResponse response) throws IOException {
        write(response, 403, ApiError.of("FORBIDDEN", "Access is denied"));
    }

    public void notFound(HttpServletResponse response, String code, String message)
            throws IOException {
        write(response, 404, ApiError.of(code, message));
    }

    private void write(HttpServletResponse response, int status, ApiError error)
            throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), error);
    }
}
