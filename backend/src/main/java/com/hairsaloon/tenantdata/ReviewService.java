package com.hairsaloon.tenantdata;

import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.auth.UserRole;
import com.hairsaloon.platform.PlatformApiException;
import com.hairsaloon.tenant.TenantContext;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
class ReviewService {
    static final String EXISTS_MESSAGE = "A review already exists for this booking";

    private final ReviewRepository reviews;
    private final BookingRepository bookings;
    private final TransactionTemplate transactions;

    ReviewService(ReviewRepository reviews, BookingRepository bookings,
                  PlatformTransactionManager transactionManager) {
        this.reviews = reviews;
        this.bookings = bookings;
        this.transactions = new TransactionTemplate(transactionManager);
    }

    ReviewDtos.ReviewResponse create(AuthenticatedUser user, long bookingId,
                                     int rating, String comment) {
        requireCustomer(user);
        if (bookingId <= 0)
            throw TenantInputPolicy.validation("bookingId", "must be positive");
        if (rating < 1 || rating > 5)
            throw TenantInputPolicy.validation("rating", "must be between 1 and 5");
        String safeComment = TenantInputPolicy.text(comment, 1000, "comment", false);
        long salonId = TenantContext.requireSalonId();
        try {
            Review review = transactions.execute(status -> {
                Booking booking = bookings.findByIdAndSalonIdAndCustomerId(
                    bookingId, salonId, user.id()).orElseThrow(() ->
                        TenantInputPolicy.notFound("booking"));
                if (booking.getStatus() != BookingStatus.COMPLETED)
                    throw TenantInputPolicy.conflict("BOOKING_NOT_COMPLETED",
                        "Only a completed booking can be reviewed");
                if (reviews.existsBySalonIdAndBookingIdAndCustomerId(
                        salonId, bookingId, user.id()))
                    throw reviewExists();
                return reviews.saveAndFlush(new Review(
                    salonId, bookingId, user.id(), rating, safeComment));
            });
            return ReviewDtos.ReviewResponse.from(review);
        } catch (DataIntegrityViolationException duplicateRace) {
            throw reviewExists();
        }
    }

    @Transactional(readOnly = true)
    ReviewDtos.ReviewPage page(int page, int size) {
        if (page < 0) throw TenantInputPolicy.validation("page", "must not be negative");
        if (size < 1 || size > 100)
            throw TenantInputPolicy.validation("size", "must be between 1 and 100");
        long salonId = TenantContext.requireSalonId();
        var result = reviews.findPublicPage(salonId, PageRequest.of(page, size));
        Object[] totals = reviews.summarize(salonId).get(0);
        long count = number(totals[0]).longValue();
        double average = number(totals[1]).doubleValue();
        Map<Integer, Long> distribution = new LinkedHashMap<>();
        for (int rating = 1; rating <= 5; rating++)
            distribution.put(rating, number(totals[rating + 1]).longValue());
        return new ReviewDtos.ReviewPage(
            result.getContent().stream().map(ReviewDtos.ReviewResponse::from).toList(),
            new ReviewDtos.Summary(average, count, distribution),
            new ReviewDtos.PageInfo(result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages(),
                result.isFirst(), result.isLast()));
    }

    private static Number number(Object value) {
        return value == null ? 0 : (Number) value;
    }

    private static PlatformApiException reviewExists() {
        return TenantInputPolicy.conflict("REVIEW_EXISTS", EXISTS_MESSAGE);
    }

    private static void requireCustomer(AuthenticatedUser user) {
        if (user == null || user.role() != UserRole.CUSTOMER)
            throw new PlatformApiException(HttpStatus.FORBIDDEN, "FORBIDDEN",
                "Customer access is required");
    }
}
