import React from 'react';
import { render } from '@testing-library/react';
import ProgressBar from '../../components/MultiStepForm/ProgressBar/ProgressBar';

const steps = ['Personal Info', 'Health Info', 'Health Questions', 'Emergency Contact', 'Terms'];

describe('ProgressBar', () => {
  it('renders step labels', () => {
    const { container } = render(
      <ProgressBar
        currentStep={1}
        steps={steps}
        handleStepClick={jest.fn()}
        errors={{}}
        formData={{}}
        isSocialRegistration={false}
        isStepCompleted={() => false}
      />
    );
    expect(container.textContent).toContain('Personal Info');
  });
});
