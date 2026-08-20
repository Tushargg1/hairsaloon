const statusStyles = {
  CONFIRMED: 'status-confirmed',
  COMPLETED: 'status-completed',
  CANCELLED: 'status-cancelled',
  NO_SHOW: 'status-no-show',
}

const statusLabels = {
  CONFIRMED: 'Confirmed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  NO_SHOW: 'No Show',
}

export default function StatusChip({ status }) {
  return (
    <span className={`status-chip ${statusStyles[status] || 'status-confirmed'}`}>
      {statusLabels[status] || status}
    </span>
  )
}
