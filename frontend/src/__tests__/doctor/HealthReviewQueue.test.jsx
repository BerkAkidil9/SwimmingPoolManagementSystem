import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HealthReviewQueue from '../../components/DoctorDashboard/HealthReviewQueue';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: [] })), put: jest.fn() }));

describe('HealthReviewQueue', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <HealthReviewQueue />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
