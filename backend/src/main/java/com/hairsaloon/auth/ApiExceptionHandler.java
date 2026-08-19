package com.hairsaloon.auth;

import com.hairsaloon.platform.PlatformApiException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(AuthException.class)
    ResponseEntity<ApiError> authError(AuthException exception) {
        ResponseEntity.BodyBuilder response = ResponseEntity.status(exception.status());
        if (exception.retryAfterSeconds() != null) {
            response.header(HttpHeaders.RETRY_AFTER,
                Long.toString(exception.retryAfterSeconds()));
        }
        return response.body(ApiError.of(exception.code(), exception.getMessage()));
    }

    @ExceptionHandler(PlatformApiException.class)
    ResponseEntity<ApiError> platformError(PlatformApiException exception) {
        return ResponseEntity.status(exception.status()).body(new ApiError(
            exception.code(), exception.getMessage(), exception.fieldErrors()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ApiError> validationError(MethodArgumentNotValidException exception) {
        Map<String, String> fields = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors().forEach(error ->
            fields.putIfAbsent(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(new ApiError(
            "VALIDATION_ERROR", "Request validation failed", fields));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ApiError> malformedRequest() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
            .body(ApiError.of("BAD_REQUEST", "Malformed request body"));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    ResponseEntity<ApiError> missingParameter(MissingServletRequestParameterException exception) {
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_ERROR",
            "Request validation failed", Map.of(exception.getParameterName(), "is required")));
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    ResponseEntity<ApiError> invalidParameter(MethodArgumentTypeMismatchException exception) {
        return ResponseEntity.badRequest().body(new ApiError("VALIDATION_ERROR",
            "Request validation failed", Map.of(exception.getName(), "has an invalid value")));
    }
}
