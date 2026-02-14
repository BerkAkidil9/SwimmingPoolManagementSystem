import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DoctorDashboard from '../../components/DoctorDashboard/DoctorDashboard';

jest.mock('../../components/DoctorDashboard/HealthReviewQueue', () => () => <div data-testid="health-review-queue">Reviews</div>);
jest.mock('../../components/DoctorDashboard/HealthReportReminders', () => () => <div data-testid="reminders">Reminders</div>);
jest.mock('../../components/Navbar/Navbar', () => () => <nav>Nav</nav>);

describe('DoctorDashboard', () => {
  it('renders health information reviews', () => {
    render(
      <MemoryRouter>
        <DoctorDashboard />
      </MemoryRouter>
    );
    expect(screen.getByTestId('health-review-queue')).toBeInTheDocument();
  });
});
