// Vintage ticket shown after a booking is confirmed. Details are passed in
// so the same styling works for any salon.
export default function BookingTicket({ salonName, services, staffName, dateLabel, timeLabel, price, minutes }) {
  return (
    <div className="ticket">
      <div className="ticket-header">
        <span className="ticket-eyebrow">Confirmed</span>
        <h3 className="ticket-title">{salonName}</h3>
      </div>

      <div className="ticket-perf" aria-hidden="true" />

      <div className="ticket-body">
        <div className="ticket-row">
          <span className="ticket-label">Services</span>
          <span className="ticket-value">{services || '—'}</span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">Barber</span>
          <span className="ticket-value">{staffName || 'Any barber'}</span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">Date</span>
          <span className="ticket-value">{dateLabel}</span>
        </div>
        <div className="ticket-row">
          <span className="ticket-label">Time</span>
          <span className="ticket-value">{timeLabel}</span>
        </div>
        {minutes != null && (
          <div className="ticket-row">
            <span className="ticket-label">Duration</span>
            <span className="ticket-value">{minutes} min</span>
          </div>
        )}
      </div>

      <div className="ticket-perf" aria-hidden="true" />

      <div className="ticket-footer">
        {price != null && (
          <div className="ticket-total">
            <span className="ticket-label">Total</span>
            <span className="ticket-price">{price}</span>
          </div>
        )}
        <div className="ticket-barcode" aria-hidden="true" />
        <p className="ticket-mark">&mdash; {salonName} &mdash;</p>
      </div>
    </div>
  )
}
