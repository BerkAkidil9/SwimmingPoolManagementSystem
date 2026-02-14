import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StaffVerification from '../../components/StaffVerification';

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));
jest.mock('react-qr-scanner', () => () => <div data-testid="qr-scanner">QR Scanner</div>);

describe('StaffVerification', () => {
  it('renders staff verification component', () => {
    render(
      <MemoryRouter>
        <StaffVerification />
      </MemoryRouter>
    );
    expect(screen.getByTestId('qr-scanner')).toBeInTheDocument();
  });
});
