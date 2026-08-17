package com.hairsaloon;

import java.time.Clock;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HairSaloonApplication {

    @Bean
    Clock applicationClock() {
        return Clock.systemUTC();
    }

    public static void main(String[] args) {
        SpringApplication.run(HairSaloonApplication.class, args);
    }
}
