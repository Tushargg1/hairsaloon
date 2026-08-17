package com.hairsaloon.auth;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

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

    private void write(HttpServletResponse response, int status, ApiError error)
            throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), error);
    }
}
