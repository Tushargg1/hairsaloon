package com.hairsaloon.tenantdata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hairsaloon.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/salon/bookings")
class CustomerBookingController {
    private final BookingService bookings;

    CustomerBookingController(BookingService bookings) { this.bookings = bookings; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    BookingDtos.BookingResponse create(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestHeader(name = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateBookingRequest request) {
        return bookings.response(bookings.create(user, request.staffId(),
            request.serviceId(), request.startDatetime(), idempotencyKey, request.promoCode()));
    }

    @GetMapping("/me")
    List<BookingDtos.BookingResponse> mine(@AuthenticationPrincipal AuthenticatedUser user) {
        return bookings.customerBookings(user).stream()
            .map(bookings::response).toList();
    }

    @PatchMapping("/{id}/cancel")
    BookingDtos.BookingResponse cancel(@AuthenticationPrincipal AuthenticatedUser user,
                                       @PathVariable long id) {
        return bookings.response(bookings.cancelCustomer(user, id));
    }

    @PatchMapping("/{id}/reschedule")
    BookingDtos.BookingResponse reschedule(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable long id, @Valid @RequestBody RescheduleRequest request) {
        return bookings.response(
            bookings.rescheduleCustomer(user, id, request.startDatetime()));
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record CreateBookingRequest(@NotNull @Positive Long staffId,
                                @NotNull @Positive Long serviceId,
                                @NotNull LocalDateTime startDatetime,
                                String promoCode) {}

    @JsonIgnoreProperties(ignoreUnknown = false)
    record RescheduleRequest(@NotNull LocalDateTime startDatetime) {}
}
