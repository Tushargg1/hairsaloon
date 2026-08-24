package com.hairsaloon.platform;

import com.hairsaloon.auth.AuthenticatedUser;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/my-bookings")
class CustomerBookingHistoryController {

    private final CustomerAccountService account;

    CustomerBookingHistoryController(CustomerAccountService account) {
        this.account = account;
    }

    @GetMapping
    List<CustomerAccountService.BookingHistoryView> list(
            @AuthenticationPrincipal AuthenticatedUser user) {
        return account.bookingHistory(user.id());
    }
}
