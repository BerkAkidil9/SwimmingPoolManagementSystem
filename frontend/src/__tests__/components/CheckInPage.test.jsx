import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CheckInPage from '../../components/CheckInPage';

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { isAuthenticated: true, user: { id: 1, role: 'user' } } })),
}));
sessionStorage.setItem('user', JSON.stringify({ id: 1, role: 'user' }));

describe('CheckInPage', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <CheckInPage />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
