import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EducationPackage from '../../pages/packages/EducationPackage';

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { prices: { education: 100 } } })),
}));

describe('EducationPackage', () => {
  it('renders education package content', () => {
    render(
      <MemoryRouter>
        <EducationPackage />
      </MemoryRouter>
    );
    expect(screen.getByText('Education Package')).toBeInTheDocument();
  });
});
