import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TransactionHistory from '../../components/TransactionHistory';

describe('TransactionHistory', () => {
  it('renders without crashing', () => {
    render(
      <MemoryRouter>
        <TransactionHistory history={{ packages: [], reservations: [] }} />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
