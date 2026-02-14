import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Pools from '../../pages/Pools/Pools';

describe('Pools', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
    );
  });

  it('renders loading state initially', () => {
    render(
      <MemoryRouter>
        <Pools />
      </MemoryRouter>
    );
    expect(document.body.textContent).toMatch(/Loading/);
  });
});
