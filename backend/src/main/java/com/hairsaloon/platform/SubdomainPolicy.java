package com.hairsaloon.platform;

import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

final class SubdomainPolicy {

    private static final Pattern FORMAT =
        Pattern.compile("[a-z0-9][a-z0-9-]{1,28}[a-z0-9]");
    private static final Set<String> RESERVED =
        Set.of("www", "api", "admin", "app", "mail");

    private SubdomainPolicy() {
    }

    static Result inspect(String input) {
        String normalized = input == null ? "" : input.trim().toLowerCase(Locale.ROOT);
        if (normalized.length() < 3 || normalized.length() > 30) {
            return new Result(normalized, false, false,
                "must be between 3 and 30 characters");
        }
        if (!FORMAT.matcher(normalized).matches()) {
            return new Result(normalized, false, false,
                "must contain only lowercase letters, numbers, or hyphens and start and end with a letter or number");
        }
        return new Result(normalized, true, RESERVED.contains(normalized), null);
    }

    record Result(String normalized, boolean valid, boolean reserved, String error) {
    }
}
