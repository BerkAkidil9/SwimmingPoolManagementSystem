import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../../pages/HomePage/HomePage';

jest.mock('../../components/Navbar/Navbar', () => () => <nav>Nav</nav>);

describe('HomePage', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
