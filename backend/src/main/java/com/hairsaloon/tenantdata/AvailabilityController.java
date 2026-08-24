package com.hairsaloon.tenantdata;

import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/salon")
class AvailabilityController {
    private final BookingService bookings;

    AvailabilityController(BookingService bookings) {
        this.bookings = bookings;
    }

    @GetMapping("/availability")
    List<BookingDtos.AvailabilitySlot> availability(
            @RequestParam List<Long> serviceId,
            @RequestParam(required = false) Long staffId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "false") boolean includeUnavailable) {
        return bookings.availability(serviceId, staffId, date, includeUnavailable);
    }
}
