import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HealthQuestionsStep from '../../components/MultiStepForm/Steps/HealthQuestionsStep';

const defaultProps = {
  formData: {
    has_heart_problems: null,
    chest_pain_activity: null,
    balance_dizziness: null,
    other_chronic_disease: null,
    prescribed_medication: null,
    bone_joint_issues: null,
    doctor_supervised_activity: null,
  },
  handleInputChange: jest.fn(),
  nextStep: jest.fn(),
  prevStep: jest.fn(),
  errors: {},
  setErrors: jest.fn(),
};

describe('HealthQuestionsStep', () => {
  it('renders form', () => {
    render(
      <MemoryRouter>
        <HealthQuestionsStep {...defaultProps} />
      </MemoryRouter>
    );
    expect(document.body).toBeTruthy();
  });
});
