import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Billing from '../../pages/Billing';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: null })) }));
jest.mock('../../components/Navbar/Navbar', () => () => <nav>Nav</nav>);
jest.mock('../../components/PaymentMethods', () => () => <div>PaymentMethods</div>);

describe('Billing', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <Billing />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
