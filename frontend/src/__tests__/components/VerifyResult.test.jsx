import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import VerifyResult from '../../components/VerifyResult/VerifyResult';

describe('VerifyResult', () => {
  it('shows error state when status is not success', () => {
    render(
      <MemoryRouter initialEntries={['/verify-result?status=error']}>
        <VerifyResult />
      </MemoryRouter>
    );
    const headings = screen.getAllByRole('heading');
    expect(headings.some(h => /Link Expired|Invalid/i.test(h.textContent))).toBe(true);
  });

  it('shows success when status=success', () => {
    render(
      <MemoryRouter initialEntries={['/verify-result?status=success']}>
        <VerifyResult />
      </MemoryRouter>
    );
    expect(screen.getByText(/Email Verified/i)).toBeInTheDocument();
  });
});
