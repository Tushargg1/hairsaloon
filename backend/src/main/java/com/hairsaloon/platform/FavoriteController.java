package com.hairsaloon.platform;

import com.hairsaloon.auth.AuthenticatedUser;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/platform/favorites")
class FavoriteController {

    private final JdbcTemplate jdbc;

    FavoriteController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    List<FavoriteResponse> list(@AuthenticationPrincipal AuthenticatedUser user) {
        return jdbc.query("""
            SELECT f.salon_id, s.name, s.subdomain, s.city, s.logo_url
            FROM user_favorites f JOIN salons s ON s.id = f.salon_id
            WHERE f.user_id = ? ORDER BY f.created_at DESC
            """, (rs, row) -> new FavoriteResponse(
                rs.getLong("salon_id"), rs.getString("name"),
                rs.getString("subdomain"), rs.getString("city"),
                rs.getString("logo_url")), user.id());
    }

    @PostMapping("/{salonId}")
    ResponseEntity<Void> add(@AuthenticationPrincipal AuthenticatedUser user,
                              @PathVariable long salonId) {
        jdbc.update("""
            INSERT INTO user_favorites (user_id, salon_id) VALUES (?, ?)
            ON CONFLICT (user_id, salon_id) DO NOTHING
            """, user.id(), salonId);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @DeleteMapping("/{salonId}")
    ResponseEntity<Void> remove(@AuthenticationPrincipal AuthenticatedUser user,
                                 @PathVariable long salonId) {
        jdbc.update("DELETE FROM user_favorites WHERE user_id = ? AND salon_id = ?",
            user.id(), salonId);
        return ResponseEntity.noContent().build();
    }

    record FavoriteResponse(long salonId, String name, String subdomain, String city, String logoUrl) {}
}
