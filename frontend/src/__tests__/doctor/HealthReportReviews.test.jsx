import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HealthReportReviews from '../../components/DoctorDashboard/HealthReportReviews';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: [] })), put: jest.fn() }));

describe('HealthReportReviews', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <HealthReportReviews />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
