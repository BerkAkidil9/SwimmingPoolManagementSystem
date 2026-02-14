import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import EmailVerification from '../../components/EmailVerification/EmailVerification';

jest.mock('../../config', () => ({ API_BASE_URL: 'http://localhost:3001' }));
global.fetch = jest.fn(() => Promise.resolve({
  ok: false,
  status: 400,
  json: () => Promise.resolve({ message: 'Invalid token' }),
}));

describe('EmailVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('renders verifying state initially with token', async () => {
    render(
      <MemoryRouter initialEntries={['/verify-email/test-token']}>
        <Routes>
          <Route path="/verify-email/:token" element={<EmailVerification />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/Verifying|verifying/i)).toBeInTheDocument();
  });
});
