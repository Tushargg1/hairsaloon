package com.hairsaloon.notification;

public interface EmailGateway {
    void send(EmailMessage message, String idempotencyKey) throws Exception;
}
