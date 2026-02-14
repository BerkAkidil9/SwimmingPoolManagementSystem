import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TermsStep from '../../components/MultiStepForm/Steps/TermsStep';

const defaultProps = {
  formData: { terms_accepted: false, privacy_accepted: false, marketing_accepted: false },
  handleInputChange: jest.fn(),
  prevStep: jest.fn(),
  handleSubmit: jest.fn(),
  errors: {},
  setErrors: jest.fn(),
  isSubmitting: false,
};

describe('TermsStep', () => {
  it('renders terms and privacy checkboxes', () => {
    render(
      <MemoryRouter>
        <TermsStep {...defaultProps} />
      </MemoryRouter>
    );
    expect(screen.getAllByText(/Terms and Conditions/i).length).toBeGreaterThan(0);
  });
});
