import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PaymentMethods from '../../components/PaymentMethods';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: [] })), post: jest.fn(), delete: jest.fn() }));

describe('PaymentMethods', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <PaymentMethods />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
