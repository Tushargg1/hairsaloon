package com.hairsaloon.tenantdata;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

final class BookingDtos {
    private BookingDtos() {}

    record AvailabilitySlot(Long staffId, String staffName,
                            LocalDateTime startDatetime, LocalDateTime endDatetime,
                            boolean available) {}

    record BookingResponse(Long id, Long customerId, String customerName,
        String customerPhone, BookingSource bookingSource, BookingSource source,
        String guestName,
        String guestPhone, Long staffId, String staffName, Long serviceId,
        LocalDateTime startDatetime, LocalDateTime endDatetime, BookingStatus status,
        BigDecimal price, BigDecimal originalPrice, BigDecimal discountAmount,
        String promoCode, String serviceName, Instant createdAt, Instant cancelledAt,
        boolean reviewed) {
        static BookingResponse from(Booking booking, String staffName, String customerName,
                                    String customerPhone, boolean reviewed) {
            return new BookingResponse(booking.getId(), booking.getCustomerId(), customerName,
                customerPhone, booking.getBookingSource(), booking.getBookingSource(),
                booking.getGuestName(),
                booking.getGuestPhone(), booking.getStaffId(), staffName, booking.getServiceId(),
                booking.getStartDateTime(), booking.getEndDateTime(), booking.getStatus(),
                booking.getPriceSnapshot(), booking.getOriginalPrice(),
                booking.getDiscountAmount(), booking.getPromoCode(),
                booking.getServiceNameSnapshot(), booking.getCreatedAt(),
                booking.getCancelledAt(), reviewed);
        }
    }
}
