package com.hairsaloon.web;

import java.util.Map;

/**
 * The single error body shape for every API response, including the ones written
 * directly by Spring Security and the tenant-resolution filter.
 */
public record ApiError(String error, String message, Map<String, String> fieldErrors) {

    public static ApiError of(String error, String message) {
        return new ApiError(error, message, Map.of());
    }
}
