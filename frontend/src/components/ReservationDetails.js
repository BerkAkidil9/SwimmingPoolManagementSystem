import React from 'react';
import { FaCalendarAlt, FaTimes } from 'react-icons/fa';

const ReservationDetails = ({ reservation, onClose }) => {
  if (!reservation) return null;

  const { session_date, start_time, end_time, created_at, poolName, type, status } = reservation;

  return (
    <div className="reservation-details-modal">
      <div className="reservation-details-content">
        <button className="close-btn" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>
        <div className="reservation-time-info">
          <FaCalendarAlt />
          <div>
            <h4>Date & Time</h4>
            <p>
              {new Date(session_date || Date.now()).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <p className="session-time">
              {start_time || '--'} - {end_time || '--'}
            </p>
          </div>
        </div>
        <div className="reservation-meta">
          {poolName && <p>Pool: {poolName}</p>}
          {type && <p>Type: {type}</p>}
          {status && <p>Status: {status}</p>}
          {created_at && (
            <span>Booked on: {new Date(created_at).toTurkishTime?.() || new Date(created_at).toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationDetails;
