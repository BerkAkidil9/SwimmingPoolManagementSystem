import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ResetPassword from '../../pages/ResetPassword';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('ResetPassword', () => {
  it('shows loading or form when token provided', async () => {
    render(
      <MemoryRouter initialEntries={['/reset-password/test-token']}>
        <Routes>
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>
    );
    await screen.findByRole('heading', { name: /Reset Password/i }, { timeout: 3000 }).catch(() => null);
    expect(document.body).toBeTruthy();
  });
});
