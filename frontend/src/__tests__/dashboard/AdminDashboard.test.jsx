import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from '../../components/AdminDashboard/AdminDashboard';

jest.mock('../../components/AdminDashboard/PoolManagement', () => () => <div data-testid="pool-management">Pools</div>);
jest.mock('../../components/AdminDashboard/VerificationQueue', () => () => <div data-testid="verification-queue">Queue</div>);
jest.mock('../../components/AdminDashboard/SessionManagement', () => () => <div data-testid="session-management">Sessions</div>);
jest.mock('../../components/AdminDashboard/FeedbackManagement', () => () => <div data-testid="feedback-management">Feedback</div>);
jest.mock('../../components/Navbar/Navbar', () => () => <nav data-testid="navbar">Nav</nav>);

describe('AdminDashboard', () => {
  it('renders pool management by default', () => {
    render(
      <MemoryRouter>
        <AdminDashboard />
      </MemoryRouter>
    );
    expect(screen.getByTestId('pool-management')).toBeInTheDocument();
  });
});
