import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FeedbackManagement from '../../components/AdminDashboard/FeedbackManagement';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: [] })), put: jest.fn() }));

describe('FeedbackManagement', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <FeedbackManagement />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
