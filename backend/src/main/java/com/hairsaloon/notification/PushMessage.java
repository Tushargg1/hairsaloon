package com.hairsaloon.notification;

/** Sensitive endpoint and key material must never be included in logs. */
public record PushMessage(String endpoint, String p256dh, String auth,
                          String title, String body, String targetUrl,
                          String idempotencyKey) {
}
