package com.hairsaloon.platform;

import com.hairsaloon.tenant.SalonStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

final class SalonDtos {

    private SalonDtos() {
    }

    record SalonResponse(Long id, String subdomain, String name, String description,
                         String address, String city, String phone, String email,
                         String logoUrl, String timezone, SalonStatus status,
                         BigDecimal rating, long reviewCount, BigDecimal latitude,
                         BigDecimal longitude, BigDecimal distanceKm, Instant createdAt) {
    }

    record PageResponse<T>(List<T> content, int page, int size, long totalElements,
                           int totalPages, boolean first, boolean last) {
        static <T> PageResponse<T> of(List<T> content, int page, int size, long total) {
            int pages = total == 0 ? 0 : (int) Math.ceil((double) total / size);
            return new PageResponse<>(List.copyOf(content), page, size, total, pages,
                page == 0, pages == 0 || page >= pages - 1);
        }
    }

    record SubdomainResponse(String normalized, boolean valid, boolean available,
                             String reason) {
    }

    record PendingSalonResponse(Long id, String subdomain, String name, String description,
                                String address, String city, String phone, String email,
                                String logoUrl, String timezone, String ownerEmail,
                                SalonStatus status, Instant createdAt) {
    }
}
