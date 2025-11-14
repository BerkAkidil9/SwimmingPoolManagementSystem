import React, { useState } from 'react';
import { FaQuestion, FaNotesMedical } from 'react-icons/fa';
import { validateHealthQuestions } from '../../../utils/validations';
import './HealthQuestions.css';

const HealthQuestionsStep = ({ formData, handleInputChange, nextStep, prevStep, errors, setErrors }) => {
    const [hasHealthConditions, setHasHealthConditions] = useState(
        Object.keys(formData).some(key => formData[key] === true)
    );

    // Define required questions array
    const requiredQuestions = [
        'has_heart_problems',
        'chest_pain_activity',
        'balance_dizziness',
        'other_chronic_disease',
        'prescribed_medication',
        'bone_joint_issues',
        'doctor_supervised_activity'
    ];

    const validateField = (name, value) => {
        const fieldValue = { [name]: value };
        const fieldErrors = {};

        switch (name) {
            case 'has_heart_problems':
            case 'chest_pain_activity':
            case 'balance_dizziness':
            case 'other_chronic_disease':
            case 'prescribed_medication':
            case 'bone_joint_issues':
            case 'doctor_supervised_activity':
                if (value === null || value === undefined) {
                    fieldErrors[name] = "Please answer this question";
                }
                break;

            case 'health_additional_info':
                // Only validate additional info if any health condition is true
                const hasHealthCondition = Object.keys(formData).some(key => 
                    requiredQuestions.includes(key) && formData[key] === true
                );
                
                if (hasHealthCondition && !value?.trim()) {
                    fieldErrors.health_additional_info = "Please provide details about your health conditions";
                } else if (value?.length > 1000) {
                    fieldErrors.health_additional_info = "Additional information is too long (max 1000 characters)";
                }
                break;
        }

        if (fieldErrors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: fieldErrors[name]
            }));
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        handleInputChange(e);
        validateField(name, value);
    };

    const handleYesNoChange = (name, value) => {
        handleInputChange({
            target: { name, value: value }
        });
        validateField(name, value);

        // Update hasHealthConditions state
        const updatedFormData = { ...formData, [name]: value };
        setHasHealthConditions(Object.keys(updatedFormData).some(key => 
            requiredQuestions.includes(key) && updatedFormData[key] === true
        ));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validationErrors = validateHealthQuestions(formData);
        
        if (Object.keys(validationErrors).length === 0) {
            nextStep();
        } else {
            setErrors(validationErrors);
            const firstError = document.querySelector('.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const questions = [
        {
            name: 'has_heart_problems',
            label: 'Do you have any heart problems or cardiovascular diseases?'
        },
        {
            name: 'chest_pain_activity',
            label: 'Do you experience chest pain during physical activity?'
        },
        {
            name: 'balance_dizziness',
            label: 'Do you have any balance problems or experience dizziness?'
        },
        {
            name: 'other_chronic_disease',
            label: 'Do you have any other chronic diseases?'
        },
        {
            name: 'prescribed_medication',
            label: 'Are you currently taking any prescribed medications?'
        },
        {
            name: 'bone_joint_issues',
            label: 'Do you have any bone or joint problems?'
        },
        {
            name: 'doctor_supervised_activity',
            label: 'Has a doctor ever recommended that you should only do physical activity under medical supervision?'
        }
    ];

    return (
        <div className="form-step health-questions-step">
            <h2 className="form-section-header">Health Questions</h2>
            
            <form onSubmit={handleSubmit}>
                {questions.map(question => (
                    <div key={question.name} className="question-card">
                        <label className="required-field"><FaQuestion style={{ color: '#0078d4' }} /> {question.label}</label>
                        <div className="question-content">
                            <div className="yes-no-buttons">
                                <button
                                    type="button"
                                    className={`answer-btn yes ${formData[question.name] === true ? 'active' : ''}`}
                                    onClick={() => handleYesNoChange(question.name, true)}
                                >
                                    Yes
                                </button>
                                <button
                                    type="button"
                                    className={`answer-btn no ${formData[question.name] === false ? 'active' : ''}`}
                                    onClick={() => handleYesNoChange(question.name, false)}
                                >
                                    No
                                </button>
                            </div>
                            {errors?.[question.name] && (
                                <span className="error question-error">{errors[question.name]}</span>
                            )}
                        </div>
                    </div>
                ))}

                {hasHealthConditions && (
                    <div className="form-group">
                        <label htmlFor="health_additional_info" className="required-field">
                            <FaNotesMedical /> Additional Health Information:
                        </label>
                        <textarea
                            id="health_additional_info"
                            name="health_additional_info"
                            value={formData.health_additional_info || ''}
                            onChange={handleChange}
                            placeholder="Please provide details about your health conditions..."
                            rows="4"
                        />
                        {errors?.health_additional_info && (
                            <span className="error">{errors.health_additional_info}</span>
                        )}
                    </div>
                )}

                <div className="form-navigation">
                    <button 
                        type="button" 
                        className="nav-button prev-button"
                        onClick={prevStep}
                    >
                        Previous
                    </button>
                    <button 
                        type="submit" 
                        className="nav-button next-button"
                    >
                        Next
                    </button>
                </div>
            </form>
        </div>
    );
};

export default HealthQuestionsStep;