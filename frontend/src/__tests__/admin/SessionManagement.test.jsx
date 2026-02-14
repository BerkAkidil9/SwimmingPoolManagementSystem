import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SessionManagement from '../../components/AdminDashboard/SessionManagement';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: [] })), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));

describe('SessionManagement', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <SessionManagement />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
