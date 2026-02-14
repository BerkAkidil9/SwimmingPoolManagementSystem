import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerificationQueue from '../../components/AdminDashboard/VerificationQueue';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: [] })), put: jest.fn() }));

describe('VerificationQueue', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <VerificationQueue />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
