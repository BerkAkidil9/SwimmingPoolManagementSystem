<div className="reservation-time-info">
  <FaCalendarAlt />
  <div>
    <h4>Date & Time</h4>
    <p>
      {new Date(reservation.session_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })}
    </p>
    <p className="session-time">
      {reservation.start_time} - {reservation.end_time}
    </p>
  </div>
</div>

<div className="reservation-meta">
  <span>Booked on: {new Date(reservation.created_at).toTurkishTime()}</span>
</div> 