package com.hairsaloon.auth;

import java.util.Map;

public record ApiError(String error, String message, Map<String, String> fieldErrors) {

    public static ApiError of(String error, String message) {
        return new ApiError(error, message, Map.of());
    }
}
