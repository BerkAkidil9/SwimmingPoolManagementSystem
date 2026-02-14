import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MultiStepForm from '../../components/MultiStepForm/MultiStepForm';

describe('MultiStepForm', () => {
  it('renders registration form', () => {
    render(
      <MemoryRouter>
        <MultiStepForm />
      </MemoryRouter>
    );
    const nextButtons = screen.getAllByRole('button', { name: /Next/i });
    expect(nextButtons.length).toBeGreaterThan(0);
  });
});
