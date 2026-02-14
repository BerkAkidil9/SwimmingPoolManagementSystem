import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PersonalInfoStep from '../../components/MultiStepForm/Steps/PersonalInfoStep';

const mockHandleInputChange = jest.fn();
const mockNextStep = jest.fn();
const mockSetErrors = jest.fn();

const defaultProps = {
  formData: { name: '', surname: '', email: '', phone: '', date_of_birth: '', gender: '', password: '', confirmPassword: '' },
  handleInputChange: mockHandleInputChange,
  nextStep: mockNextStep,
  errors: {},
  setErrors: mockSetErrors,
  isSocialRegistration: false,
};

describe('PersonalInfoStep', () => {
  it('renders form', () => {
    render(
      <MemoryRouter>
        <PersonalInfoStep {...defaultProps} />
      </MemoryRouter>
    );
    expect(document.querySelector('form') || document.querySelector('input')).toBeTruthy();
  });
});
