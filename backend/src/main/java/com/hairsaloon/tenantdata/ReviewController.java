package com.hairsaloon.tenantdata;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.hairsaloon.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/salon/reviews")
class ReviewController {
    private final ReviewService reviews;

    ReviewController(ReviewService reviews) { this.reviews = reviews; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    ReviewDtos.ReviewResponse create(@AuthenticationPrincipal AuthenticatedUser user,
                                     @Valid @RequestBody CreateReviewRequest request) {
        return reviews.create(user, request.bookingId(), request.rating(), request.comment());
    }

    @GetMapping
    ReviewDtos.ReviewPage reviews(@RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        return reviews.page(page, size);
    }

    static final class CreateReviewRequest {
        @NotNull @Positive
        private Long bookingId;
        @NotNull @Min(1) @Max(5)
        private Integer rating;
        private String comment;

        public void setBookingId(Long bookingId) { this.bookingId = bookingId; }
        public void setRating(Integer rating) { this.rating = rating; }
        public void setComment(String comment) { this.comment = comment; }

        @JsonAnySetter
        public void rejectUnknownField(String name, Object value) {
            throw new IllegalArgumentException("Unknown review field: " + name);
        }

        Long bookingId() { return bookingId; }
        Integer rating() { return rating; }
        String comment() { return comment; }
    }
}
