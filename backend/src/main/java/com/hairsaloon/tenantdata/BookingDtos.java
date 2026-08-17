package com.hairsaloon.tenantdata;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

final class BookingDtos {
    private BookingDtos() {}

    record AvailabilitySlot(Long staffId, String staffName,
                            LocalDateTime startDatetime, LocalDateTime endDatetime) {}

    record BookingResponse(Long id, Long customerId, Long staffId, String staffName,
                           Long serviceId, LocalDateTime startDatetime,
                           LocalDateTime endDatetime, BookingStatus status, BigDecimal price,
                           String serviceName, Instant createdAt, Instant cancelledAt,
                           boolean reviewed) {
        static BookingResponse from(Booking booking, String staffName, boolean reviewed) {
            return new BookingResponse(booking.getId(), booking.getCustomerId(),
                booking.getStaffId(), staffName, booking.getServiceId(),
                booking.getStartDateTime(), booking.getEndDateTime(), booking.getStatus(),
                booking.getPriceSnapshot(), booking.getServiceNameSnapshot(),
                booking.getCreatedAt(), booking.getCancelledAt(), reviewed);
        }
    }
}
