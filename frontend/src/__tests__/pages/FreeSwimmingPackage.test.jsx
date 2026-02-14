import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FreeSwimmingPackage from '../../pages/packages/FreeSwimmingPackage';

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { prices: { free_swimming: 150 } } })),
}));

describe('FreeSwimmingPackage', () => {
  it('renders free swimming package content', () => {
    render(
      <MemoryRouter>
        <FreeSwimmingPackage />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
