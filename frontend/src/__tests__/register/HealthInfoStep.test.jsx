import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HealthInfoStep from '../../components/MultiStepForm/Steps/HealthInfoStep';

const defaultProps = {
  formData: { height: '', weight: '', blood_type: '', allergies: '', chronic_conditions: '', medications: '' },
  handleInputChange: jest.fn(),
  nextStep: jest.fn(),
  prevStep: jest.fn(),
  errors: {},
  setErrors: jest.fn(),
};

describe('HealthInfoStep', () => {
  it('renders form with height and weight inputs', () => {
    render(
      <MemoryRouter>
        <HealthInfoStep {...defaultProps} />
      </MemoryRouter>
    );
    expect(document.querySelector('input[name="height"]') || document.querySelector('select[name="blood_type"]')).toBeTruthy();
  });
});
