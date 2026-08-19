package com.hairsaloon.tenantdata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hairsaloon.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("/api/salon/dashboard/bookings")
class DashboardBookingController {
    private final SalonOwnershipVerifier ownership;
    private final BookingService bookings;

    DashboardBookingController(SalonOwnershipVerifier ownership, BookingService bookings) {
        this.ownership = ownership;
        this.bookings = bookings;
    }

    @GetMapping
    List<BookingDtos.BookingResponse> bookings(@AuthenticationPrincipal AuthenticatedUser user,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) Long staffId) {
        ownership.verifyOwner(user);
        return bookings.dashboardBookings(date, startDate, endDate, staffId).stream()
            .map(bookings::response).toList();
    }

    @PostMapping("/walk-ins")
    @ResponseStatus(HttpStatus.CREATED)
    BookingDtos.BookingResponse walkIn(@AuthenticationPrincipal AuthenticatedUser user,
            @Valid @RequestBody WalkInRequest request) {
        ownership.verifyOwner(user);
        return bookings.response(bookings.createWalkIn(request.staffId(), request.serviceId(),
            request.startDatetime(), request.guestName(), request.guestPhone()));
    }

    @PatchMapping("/{id}/status")
    BookingDtos.BookingResponse status(@AuthenticationPrincipal AuthenticatedUser user,
            @PathVariable long id, @Valid @RequestBody StatusRequest request) {
        ownership.verifyOwner(user);
        return bookings.response(bookings.transition(id, request.status()));
    }

    @PatchMapping("/{id}/cancel")
    BookingDtos.BookingResponse cancel(@AuthenticationPrincipal AuthenticatedUser user,
                                       @PathVariable long id) {
        ownership.verifyOwner(user);
        return bookings.response(bookings.cancelOwner(id));
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record WalkInRequest(@NotNull @Positive Long staffId,
        @NotNull @Positive Long serviceId, @NotNull LocalDateTime startDatetime,
        @NotBlank String guestName, @NotBlank String guestPhone) {}

    @JsonIgnoreProperties(ignoreUnknown = false)
    record StatusRequest(@NotNull BookingStatus status) {}
}
