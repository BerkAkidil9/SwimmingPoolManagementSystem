import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CoachDashboard from '../../components/CoachDashboard/CoachDashboard';

jest.mock('axios', () => ({
  get: () => Promise.resolve({ data: [] }),
  put: () => Promise.resolve({}),
}));
jest.mock('../../components/Navbar/Navbar', () => () => <nav>Nav</nav>);

describe('CoachDashboard', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <CoachDashboard />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
