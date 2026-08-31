package com.hairsaloon.tenantdata;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hairsaloon.auth.AuthenticatedUser;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/salon/dashboard")
class SalonDashboardController {
    private final SalonOwnershipVerifier ownership;
    private final SalonManagementService service;
    private final GoogleProfileService google;

    SalonDashboardController(SalonOwnershipVerifier ownership, SalonManagementService service,
                             GoogleProfileService google) {
        this.ownership = ownership;
        this.service = service;
        this.google = google;
    }

    @GetMapping("/profile")
    ProfileResponse profile(@AuthenticationPrincipal AuthenticatedUser user) {
        ownership.verifyOwner(user);
        return profileResponse(service.profile());
    }

    @PostMapping("/google/preview")
    GoogleProfileService.Preview previewGoogle(@AuthenticationPrincipal AuthenticatedUser user,
                                               @Valid @RequestBody GoogleRequest request) {
        ownership.verifyOwner(user);
        return google.preview(request.googleUrl());
    }

    @PostMapping("/google/apply")
    ProfileResponse applyGoogle(@AuthenticationPrincipal AuthenticatedUser user,
                                @Valid @RequestBody GoogleApplyRequest request) {
        ownership.verifyOwner(user);
        return profileResponse(google.apply(request.googleUrl(),
            Boolean.TRUE.equals(request.overwriteContact())));
    }

    @PutMapping("/profile")
    ProfileResponse updateProfile(@AuthenticationPrincipal AuthenticatedUser user,
                                  @Valid @RequestBody ProfileRequest request) {
        ownership.verifyOwner(user);
        return profileResponse(service.updateProfile(request.name(), request.description(),
            request.address(), request.city(), request.phone(), request.email(),
            request.logoUrl(), request.timezone(), request.cancellationWindowMinutes(),
            new SalonManagementService.SocialLinks(request.instagramUrl(),
                request.facebookUrl(), request.whatsappUrl(), request.youtubeUrl(),
                request.mapsUrl())));
    }

    @GetMapping("/services")
    List<ServiceResponse> services(@AuthenticationPrincipal AuthenticatedUser user) {
        ownership.verifyOwner(user);
        return service.services().stream().map(SalonDashboardController::serviceResponse).toList();
    }

    @PutMapping("/service-categories")
    CategoryOrderResponse updateCategoryOrder(@AuthenticationPrincipal AuthenticatedUser user,
                                              @Valid @RequestBody CategoryOrderRequest request) {
        ownership.verifyOwner(user);
        return new CategoryOrderResponse(
            service.updateCategoryOrder(request.categories()).getCategoryOrder());
    }

    @PostMapping("/services")
    @ResponseStatus(HttpStatus.CREATED)
    ServiceResponse createService(@AuthenticationPrincipal AuthenticatedUser user,
                                  @Valid @RequestBody CreateServiceRequest request) {
        ownership.verifyOwner(user);
        return serviceResponse(service.createService(request.name(), request.durationMinutes(),
            request.price(), request.category()));
    }

    @PutMapping("/services/{id}")
    ServiceResponse updateService(@AuthenticationPrincipal AuthenticatedUser user,
                                  @PathVariable long id,
                                  @Valid @RequestBody UpdateServiceRequest request) {
        ownership.verifyOwner(user);
        return serviceResponse(service.updateService(id, request.name(),
            request.durationMinutes(), request.price(), request.category(), request.active()));
    }

    @DeleteMapping("/services/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteService(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable long id) {
        ownership.verifyOwner(user);
        service.deleteService(id);
    }

    @GetMapping("/staff")
    List<StaffResponse> staff(@AuthenticationPrincipal AuthenticatedUser user) {
        ownership.verifyOwner(user);
        return service.staff().stream().map(SalonDashboardController::staffResponse).toList();
    }

    @PostMapping("/staff")
    @ResponseStatus(HttpStatus.CREATED)
    StaffResponse createStaff(@AuthenticationPrincipal AuthenticatedUser user,
                              @Valid @RequestBody CreateStaffRequest request) {
        ownership.verifyOwner(user);
        return staffResponse(service.createStaff(request.name(), request.photoUrl(),
            request.characterKey()));
    }

    @PutMapping("/staff/{id}")
    StaffResponse updateStaff(@AuthenticationPrincipal AuthenticatedUser user,
                              @PathVariable long id,
                              @Valid @RequestBody UpdateStaffRequest request) {
        ownership.verifyOwner(user);
        return staffResponse(service.updateStaff(id, request.name(), request.photoUrl(),
            request.characterKey(), request.active()));
    }

    @DeleteMapping("/staff/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteStaff(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable long id) {
        ownership.verifyOwner(user);
        service.deleteStaff(id);
    }

    @PutMapping("/staff/{id}/services")
    StaffResponse replaceAssignments(@AuthenticationPrincipal AuthenticatedUser user,
                                     @PathVariable long id,
                                     @Valid @RequestBody AssignmentRequest request) {
        ownership.verifyOwner(user);
        return staffResponse(service.replaceAssignments(id, request.serviceIds()));
    }

    @PutMapping("/staff/{id}/working-hours")
    List<WorkingHourResponse> replaceHours(@AuthenticationPrincipal AuthenticatedUser user,
                                           @PathVariable long id,
                                           @Valid @RequestBody WorkingHoursRequest request) {
        ownership.verifyOwner(user);
        return service.replaceHours(id, request.workingHours().stream()
            .map(hour -> new SalonManagementService.HourInput(hour.dayOfWeek(),
                hour.startTime(), hour.endTime())).toList()).stream()
            .map(SalonDashboardController::hourResponse).toList();
    }

    @GetMapping("/staff/{id}/time-off")
    List<TimeOffResponse> timeOff(@AuthenticationPrincipal AuthenticatedUser user,
                                  @PathVariable long id) {
        ownership.verifyOwner(user);
        return service.timeOff(id).stream().map(SalonDashboardController::timeOffResponse).toList();
    }

    @PostMapping("/staff/{id}/time-off")
    @ResponseStatus(HttpStatus.CREATED)
    TimeOffResponse createTimeOff(@AuthenticationPrincipal AuthenticatedUser user,
                                  @PathVariable long id,
                                  @Valid @RequestBody TimeOffRequest request) {
        ownership.verifyOwner(user);
        return timeOffResponse(service.createTimeOff(id, request.startDateTime(),
            request.endDateTime(), request.reason()));
    }

    @DeleteMapping("/staff/{id}/time-off/{timeOffId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteTimeOff(@AuthenticationPrincipal AuthenticatedUser user,
                       @PathVariable long id, @PathVariable long timeOffId) {
        ownership.verifyOwner(user);
        service.deleteTimeOff(id, timeOffId);
    }

    private static ProfileResponse profileResponse(Salon salon) {
        return new ProfileResponse(salon.getId(), salon.getSubdomain(), salon.getName(),
            salon.getDescription(), salon.getAddress(), salon.getCity(), salon.getPhone(),
            salon.getEmail(), salon.getLogoUrl(), salon.getTimezone(), salon.getStatus(),
            salon.getCancellationWindowMinutes(), salon.getInstagramUrl(),
            salon.getFacebookUrl(), salon.getWhatsappUrl(), salon.getYoutubeUrl(),
            salon.getMapsUrl(), salon.getCategoryOrder());
    }

    private static ServiceResponse serviceResponse(SalonServiceEntity value) {
        return new ServiceResponse(value.getId(), value.getName(), value.getDurationMinutes(),
            value.getPrice(), value.getCategory(), value.isActive());
    }

    private static StaffResponse staffResponse(SalonManagementService.StaffDetails value) {
        SalonStaff member = value.staff();
        return new StaffResponse(member.getId(), member.getName(), member.getPhotoUrl(),
            member.getCharacterKey(), member.isActive(), value.serviceIds(),
            value.workingHours().stream()
                .map(SalonDashboardController::hourResponse).toList());
    }

    private static WorkingHourResponse hourResponse(StaffWorkingHour value) {
        return new WorkingHourResponse(value.getId(), value.getDayOfWeek(),
            value.getStartTime(), value.getEndTime());
    }

    private static TimeOffResponse timeOffResponse(StaffTimeOff value) {
        return new TimeOffResponse(value.getId(), value.getStartDateTime(),
            value.getEndDateTime(), value.getReason(), value.getCreatedAt());
    }

    @JsonIgnoreProperties(ignoreUnknown = false)
    record ProfileRequest(@NotBlank @Size(max = 160) String name,
        @Size(max = 5000) String description, @NotBlank @Size(max = 500) String address,
        @NotBlank @Size(max = 120) String city, @Size(max = 32) String phone,
        @Size(max = 320) String email, @Size(max = 2048) String logoUrl,
        @NotBlank @Size(max = 64) String timezone,
        @NotNull @Min(0) @Max(525600) Integer cancellationWindowMinutes,
        @Size(max = 2048) String instagramUrl, @Size(max = 2048) String facebookUrl,
        @Size(max = 2048) String whatsappUrl, @Size(max = 2048) String youtubeUrl,
        @Size(max = 2048) String mapsUrl) {}

    @JsonIgnoreProperties(ignoreUnknown = false)
    record GoogleRequest(@NotBlank @Size(max = 2048) String googleUrl) {}
    @JsonIgnoreProperties(ignoreUnknown = false)
    record GoogleApplyRequest(@NotBlank @Size(max = 2048) String googleUrl,
                              Boolean overwriteContact) {}

    @JsonIgnoreProperties(ignoreUnknown = false)
    record CategoryOrderRequest(
        @NotNull @Size(max = 100) List<@Size(max = 20) String> categories) {}
    record CategoryOrderResponse(List<String> categories) {}

    @JsonIgnoreProperties(ignoreUnknown = false)
    record CreateServiceRequest(@NotBlank @Size(max = 36) String name,
        @Min(15) @Max(180) int durationMinutes,
        @NotNull @DecimalMin("0.00") BigDecimal price,
        @Size(max = 20) String category) {}

    @JsonIgnoreProperties(ignoreUnknown = false)
    record UpdateServiceRequest(@NotBlank @Size(max = 36) String name,
        @Min(15) @Max(180) int durationMinutes,
        @NotNull @DecimalMin("0.00") BigDecimal price,
        @Size(max = 20) String category, @NotNull Boolean active) {}

    @JsonIgnoreProperties(ignoreUnknown = false)
    record CreateStaffRequest(@NotBlank @Size(max = 160) String name,
                              @Size(max = 2048) String photoUrl,
                              @Size(max = 40) String characterKey) {}
    @JsonIgnoreProperties(ignoreUnknown = false)
    record UpdateStaffRequest(@NotBlank @Size(max = 160) String name,
                              @Size(max = 2048) String photoUrl,
                              @Size(max = 40) String characterKey,
                              @NotNull Boolean active) {}

    @JsonIgnoreProperties(ignoreUnknown = false)
    record AssignmentRequest(@NotNull @Size(max = 200) List<@Positive Long> serviceIds) {}
    @JsonIgnoreProperties(ignoreUnknown = false)
    record WorkingHoursRequest(
        @NotNull @Valid @Size(max = 50) List<WorkingHourRequest> workingHours) {}
    @JsonIgnoreProperties(ignoreUnknown = false)
    record WorkingHourRequest(@Min(0) @Max(6) int dayOfWeek,
                              @NotNull LocalTime startTime,
                              @NotNull LocalTime endTime) {}
    @JsonIgnoreProperties(ignoreUnknown = false)
    record TimeOffRequest(@NotNull LocalDateTime startDateTime,
                          @NotNull LocalDateTime endDateTime,
                          @Size(max = 255) String reason) {}

    record ProfileResponse(Long id, String subdomain, String name, String description,
        String address, String city, String phone, String email, String logoUrl,
        String timezone, SalonStatus status, int cancellationWindowMinutes,
        String instagramUrl, String facebookUrl, String whatsappUrl, String youtubeUrl,
        String mapsUrl, List<String> categoryOrder) {}
    record ServiceResponse(Long id, String name, int durationMinutes, BigDecimal price,
                           String category, boolean active) {}
    record StaffResponse(Long id, String name, String photoUrl, String characterKey,
                         boolean active, List<Long> serviceIds,
                         List<WorkingHourResponse> workingHours) {}
    record WorkingHourResponse(Long id, int dayOfWeek, LocalTime startTime,
                               LocalTime endTime) {}
    record TimeOffResponse(Long id, LocalDateTime startDateTime, LocalDateTime endDateTime,
                           String reason, java.time.Instant createdAt) {}
}
