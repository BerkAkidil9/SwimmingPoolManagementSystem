import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PackagePurchase from '../../components/PackagePurchase';

jest.mock('axios', () => ({ get: jest.fn(() => Promise.resolve({ data: { prices: { education: 100, free_swimming: 150 } } })) }));
jest.mock('../../components/StripeCheckout', () => () => <div>StripeCheckout</div>);

describe('PackagePurchase', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <PackagePurchase onPurchaseComplete={() => {}} onCancel={() => {}} />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
