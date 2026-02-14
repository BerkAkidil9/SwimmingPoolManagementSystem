import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ReservationDetails from '../../components/ReservationDetails';

const mockReservation = {
  session_date: '2025-02-15',
  start_time: '09:00',
  end_time: '10:00',
  created_at: '2025-02-01T10:00:00Z',
  poolName: 'Main Pool',
  type: 'education',
  status: 'active',
};

describe('ReservationDetails', () => {
  it('renders reservation details when reservation is provided', () => {
    render(
      <MemoryRouter>
        <ReservationDetails reservation={mockReservation} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Main Pool/i)).toBeInTheDocument();
    expect(screen.getByText(/education/i)).toBeInTheDocument();
  });

  it('returns null when reservation is null', () => {
    const { container } = render(
      <MemoryRouter>
        <ReservationDetails reservation={null} onClose={() => {}} />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });
});
