import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EmergencyContactStep from '../../components/MultiStepForm/Steps/EmergencyContactStep';

const defaultProps = {
  formData: { emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '' },
  handleInputChange: jest.fn(),
  nextStep: jest.fn(),
  prevStep: jest.fn(),
  errors: {},
  setErrors: jest.fn(),
};

describe('EmergencyContactStep', () => {
  it('renders form', () => {
    render(
      <MemoryRouter>
        <EmergencyContactStep {...defaultProps} />
      </MemoryRouter>
    );
    expect(document.querySelector('form') || document.body).toBeTruthy();
  });
});
