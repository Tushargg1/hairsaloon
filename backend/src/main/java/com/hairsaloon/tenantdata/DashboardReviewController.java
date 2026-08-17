package com.hairsaloon.tenantdata;

import com.hairsaloon.auth.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/salon/dashboard/reviews")
class DashboardReviewController {
    private final SalonOwnershipVerifier ownership;
    private final ReviewService reviews;

    DashboardReviewController(SalonOwnershipVerifier ownership, ReviewService reviews) {
        this.ownership = ownership;
        this.reviews = reviews;
    }

    @GetMapping
    ReviewDtos.ReviewPage reviews(@AuthenticationPrincipal AuthenticatedUser user,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "20") int size) {
        ownership.verifyOwner(user);
        return reviews.page(page, size);
    }
}
