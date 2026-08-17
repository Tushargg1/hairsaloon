package com.hairsaloon.notification;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public final class SafeEmailTemplate {
    private static final DateTimeFormatter APPOINTMENT =
        DateTimeFormatter.ofPattern("EEE, MMM d, uuuu 'at' h:mm a");

    private SafeEmailTemplate() {}

    public static String subject(String action, String salonName) {
        return clean(action, 100) + " - " + clean(salonName, 120);
    }

    public static String bookingBody(String salonName, String action, String service,
                                     LocalDateTime start, String timezone) {
        return clean(salonName, 160) + " via HairSaloon\n\n"
            + clean(action, 200) + "\nService: " + clean(service, 160)
            + "\nAppointment: " + start.format(APPOINTMENT)
            + " (" + clean(timezone, 64) + ")\n\n"
            + "Contact the salon if you need help.";
    }

    public static String rescheduledBody(String salonName, String service,
            LocalDateTime previous, LocalDateTime current, String timezone) {
        return clean(salonName, 160) + " via HairSaloon\n\n"
            + "An appointment was rescheduled.\nService: " + clean(service, 160)
            + "\nPrevious: " + previous.format(APPOINTMENT)
            + "\nNew: " + current.format(APPOINTMENT)
            + " (" + clean(timezone, 64) + ")\n\n"
            + "Contact the salon if you need help.";
    }

    static String clean(String value, int maxLength) {
        if (value == null) return "";
        String cleaned = value.replaceAll("[\\p{Cntrl}&&[^\\t]]", " ")
            .replaceAll("\\s+", " ").trim();
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength);
    }
}
