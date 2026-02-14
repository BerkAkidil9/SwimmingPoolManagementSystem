import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HealthReportReminders from '../../components/DoctorDashboard/HealthReportReminders';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: [] })), post: jest.fn() }));

describe('HealthReportReminders', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <HealthReportReminders />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
