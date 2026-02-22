import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Pools from './Pools';

jest.mock('../../api/poolsApi', () => ({
  fetchPools: async () => [],
}));

describe('Pools', () => {
  it('renders loading state initially', () => {
    render(
      <MemoryRouter>
        <Pools />
      </MemoryRouter>
    );
    expect(document.body.textContent).toMatch(/Loading/);
  });

  it('renders empty pools message when loaded', async () => {
    render(
      <MemoryRouter>
        <Pools />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/No pools available/);
    });
  });
});
