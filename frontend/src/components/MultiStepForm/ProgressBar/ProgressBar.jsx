import React from 'react';
import './ProgressBar.css';

const ProgressBar = ({ currentStep, steps, handleStepClick, errors, formData, isSocialRegistration, isStepCompleted }) => {

    // 1) Find the highest completed step index at any given time
    const getHighestCompletedStepIndex = () => {
        let highest = -1;
        steps.forEach((_, i) => {
            if (isStepCompleted(i)) {
                highest = i;
            }
        });
        return highest;
    };

    // 2) isStepDisabled logic:
    //    A step is disabled if it's > (highestCompletedStep + 1).
    const isStepDisabled = (index) => {
        const highestCompletedStep = getHighestCompletedStepIndex();
        return index > highestCompletedStep + 1;
    };

    return (
        <div className="progress-bar">
            {steps.map((step, index) => {
                const disabled = isStepDisabled(index);
                
                // Remove the social registration skip logic
                return (
                    <div
                        key={index}
                        className={`progress-step ${currentStep === index ? 'active' : ''} 
                                  ${isStepCompleted(index) ? 'completed' : ''} 
                                  ${disabled ? 'disabled' : ''}`}
                        onClick={() => !disabled && handleStepClick(index + 1)}
                    >
                        <div className="step-number">{index + 1}</div>
                        <div className="step-label">{step}</div>
                    </div>
                );
            })}
        </div>
    );
};

export default ProgressBar;