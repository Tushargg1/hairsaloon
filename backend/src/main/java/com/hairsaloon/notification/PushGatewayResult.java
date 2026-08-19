package com.hairsaloon.notification;

public record PushGatewayResult(Disposition disposition, Integer statusCode) {
    public PushGatewayResult {
        if (disposition == null) throw new IllegalArgumentException("disposition is required");
        if (statusCode != null && (statusCode < 100 || statusCode > 599))
            throw new IllegalArgumentException("statusCode must be a valid HTTP status");
    }

    public static PushGatewayResult success() {
        return new PushGatewayResult(Disposition.SUCCESS, null);
    }

    public static PushGatewayResult retry(Integer statusCode) {
        return new PushGatewayResult(Disposition.RETRY, statusCode);
    }

    public static PushGatewayResult permanent(Integer statusCode) {
        return new PushGatewayResult(Disposition.PERMANENT_FAILURE, statusCode);
    }

    public boolean removesSubscription() {
        return statusCode != null && (statusCode == 404 || statusCode == 410);
    }

    public enum Disposition { SUCCESS, RETRY, PERMANENT_FAILURE }
}
