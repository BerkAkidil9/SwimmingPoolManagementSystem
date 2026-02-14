import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from '../../pages/LandingPage/LandingPage';

jest.mock('../../pages/Pools/Pools', () => () => <div data-testid="pools">Pools</div>);

describe('LandingPage', () => {
  it('renders hero section', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Welcome to the Swimming Center/i)).toBeInTheDocument();
  });

  it('has Register and Login links', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: /Register Now/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Login/i })).toBeInTheDocument();
  });
});
