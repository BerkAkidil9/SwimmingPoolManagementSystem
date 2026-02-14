import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MemberDashboard from '../../components/MemberDashboard';

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: [] })),
}));
jest.mock('../../components/Navbar/Navbar', () => () => <nav>Nav</nav>);
jest.mock('../../components/PackagePurchase', () => () => <div>PackagePurchase</div>);
jest.mock('../../components/TransactionHistory', () => () => <div>TransactionHistory</div>);

describe('MemberDashboard', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <MemberDashboard />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
