package com.hairsaloon.tenantdata;

import java.time.Instant;
import java.util.List;
import java.util.Map;

final class ReviewDtos {
    private ReviewDtos() {}

    record ReviewResponse(Long id, int rating, String comment, Instant createdAt,
                          String reviewer) {
        static ReviewResponse from(Review review) {
            return new ReviewResponse(review.getId(), review.getRating(), review.getComment(),
                review.getCreatedAt(), "Verified customer");
        }
    }

    record Summary(double averageRating, long totalReviews,
                   Map<Integer, Long> ratingDistribution) {}

    record PageInfo(int number, int size, long totalElements, int totalPages,
                    boolean first, boolean last) {}

    record ReviewPage(List<ReviewResponse> content, Summary summary, PageInfo page) {}
}
