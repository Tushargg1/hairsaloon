package com.hairsaloon.auth;

public interface SmsGateway {
    void sendVerificationCode(String phone, String code, String purpose);
}
