import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StripeCheckout from '../../components/StripeCheckout';

jest.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }) => <div data-testid="stripe-elements">{children}</div>,
  CardElement: () => <input data-testid="card-element" />,
  useStripe: () => ({}),
  useElements: () => ({}),
}));

describe('StripeCheckout', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <StripeCheckout packageType="education" price={100} onSuccess={() => {}} onCancel={() => {}} />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
