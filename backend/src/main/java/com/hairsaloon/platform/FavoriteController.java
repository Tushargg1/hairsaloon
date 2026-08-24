package com.hairsaloon.platform;

import com.hairsaloon.auth.AuthenticatedUser;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/platform/favorites")
class FavoriteController {

    private final CustomerAccountService account;

    FavoriteController(CustomerAccountService account) {
        this.account = account;
    }

    @GetMapping
    List<CustomerAccountService.FavoriteView> list(
            @AuthenticationPrincipal AuthenticatedUser user) {
        return account.favorites(user.id());
    }

    @PostMapping("/{salonId}")
    ResponseEntity<Void> add(@AuthenticationPrincipal AuthenticatedUser user,
                             @PathVariable long salonId) {
        account.addFavorite(user.id(), salonId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{salonId}")
    ResponseEntity<Void> remove(@AuthenticationPrincipal AuthenticatedUser user,
                                @PathVariable long salonId) {
        account.removeFavorite(user.id(), salonId);
        return ResponseEntity.noContent().build();
    }
}
