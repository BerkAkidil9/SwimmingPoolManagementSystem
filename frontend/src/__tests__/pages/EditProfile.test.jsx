import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EditProfile from '../../pages/EditProfile';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: null })), put: jest.fn() }));
jest.mock('../../components/Navbar/Navbar', () => () => <nav>Nav</nav>);

describe('EditProfile', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <EditProfile />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
