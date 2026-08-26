package com.hairsaloon.tenantdata;

import com.hairsaloon.platform.InputPolicy;
import com.hairsaloon.auth.User;
import com.hairsaloon.auth.UserRepository;
import com.hairsaloon.notification.NotificationOutboxWriter;
import com.hairsaloon.notification.NotificationType;
import com.hairsaloon.notification.PushOutboxWriter;
import com.hairsaloon.notification.PushSubscriptionAudience;
import com.hairsaloon.notification.SafeEmailTemplate;
import com.hairsaloon.tenant.Salon;
import com.hairsaloon.tenant.SalonRepository;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
class BookingNotificationService {
    private final SalonRepository salons;
    private final UserRepository users;
    private final NotificationOutboxWriter outbox;
    private final PushOutboxWriter pushOutbox;

    BookingNotificationService(SalonRepository salons, UserRepository users,
                               NotificationOutboxWriter outbox,
                               PushOutboxWriter pushOutbox) {
        this.salons = salons;
        this.users = users;
        this.outbox = outbox;
        this.pushOutbox = pushOutbox;
    }

    void confirmed(long salonId, Booking booking) {
        Salon salon = salon(salonId);
        enqueueBoth(salon, booking, NotificationType.BOOKING_CONFIRMED,
            "Booking confirmed", SafeEmailTemplate.bookingBody(salon.getName(),
                "An appointment was confirmed.", booking.getServiceNameSnapshot(),
                booking.getStartDateTime(), salon.getTimezone()), "v1");
    }

    void cancelled(long salonId, Booking booking, boolean byCustomer) {
        Salon salon = salon(salonId);
        outbox.discardPendingReminders(salonId, booking.getId());
        NotificationType type = byCustomer ? NotificationType.CUSTOMER_CANCELLED
            : NotificationType.OWNER_CANCELLED;
        String action = byCustomer ? "The customer cancelled this appointment."
            : "The salon cancelled this appointment.";
        enqueueBoth(salon, booking, type, "Booking cancelled",
            SafeEmailTemplate.bookingBody(salon.getName(), action,
                booking.getServiceNameSnapshot(), booking.getStartDateTime(),
                salon.getTimezone()), "v1");
    }
    void rescheduled(long salonId, Booking booking, LocalDateTime previous) {
        Salon salon = salon(salonId);
        outbox.discardPendingReminders(salonId, booking.getId());
        enqueueBoth(salon, booking, NotificationType.BOOKING_RESCHEDULED,
            "Booking rescheduled", SafeEmailTemplate.rescheduledBody(salon.getName(),
                booking.getServiceNameSnapshot(), previous, booking.getStartDateTime(),
                salon.getTimezone()), booking.getStartDateTime().toString());
    }

    private void enqueueBoth(Salon salon, Booking booking, NotificationType type,
                             String subjectAction, String body, String occurrence) {
        // Walk-ins deliberately have no customer identity and never receive notifications.
        if (booking.getCustomerId() == null) return;
        User customer = users.findById(booking.getCustomerId())
            .orElseThrow(() -> InputPolicy.notFound("customer"));
        String subject = SafeEmailTemplate.subject(subjectAction, salon.getName());
        outbox.enqueue(salon.getId(), booking.getId(), type, customer.getEmail(), subject,
            body, occurrence);
        String contact = salon.getEmail();
        if (contact == null || contact.isBlank()) {
            contact = users.findById(salon.getOwnerId()).map(User::getEmail).orElse(null);
        }
        outbox.enqueue(salon.getId(), booking.getId(), type, contact, subject, body,
            occurrence);

        String pushBody = "Appointment update for "
            + booking.getServiceNameSnapshot() + " at " + booking.getStartDateTime();
        pushOutbox.enqueueForUser(salon.getId(), booking.getId(), customer.getId(),
            PushSubscriptionAudience.CUSTOMER, type, subject, pushBody,
            "/bookings", occurrence);
        pushOutbox.enqueueForUser(salon.getId(), booking.getId(), salon.getOwnerId(),
            PushSubscriptionAudience.OWNER, type, subject, pushBody,
            "/dashboard/bookings", occurrence);
    }

    private Salon salon(long salonId) {
        return salons.findById(salonId)
            .orElseThrow(() -> InputPolicy.notFound("salon"));
    }
}
