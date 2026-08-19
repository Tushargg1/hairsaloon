package com.hairsaloon.notification;

/** Provider-neutral VAPID-style Web Push delivery boundary. */
public interface PushGateway {
    PushGatewayResult send(PushMessage message);
}
