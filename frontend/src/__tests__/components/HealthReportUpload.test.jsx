import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HealthReportUpload from '../../components/HealthReportUpload';

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));

describe('HealthReportUpload', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <HealthReportUpload />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
