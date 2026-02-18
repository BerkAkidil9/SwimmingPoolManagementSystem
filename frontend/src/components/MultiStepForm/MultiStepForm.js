import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PersonalInfoStep from './Steps/PersonalInfoStep';
import HealthInfoStep from './Steps/HealthInfoStep';
import EmergencyContactStep from './Steps/EmergencyContactStep';
import HealthQuestionsStep from './Steps/HealthQuestionsStep';
import TermsStep from './Steps/TermsStep';
import ProgressBar from './ProgressBar/ProgressBar';
import { validateStep as validateFormStep } from '../../utils/validations';
import './MultiStepForm.css';
import './animations.css';

const MultiStepForm = ({ isSocialRegistration: isFromSocial }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [emailVerified, setEmailVerified] = useState(false);
    const [verificationError, setVerificationError] = useState(null);
    const [formData, setFormData] = useState({
        // Personal Information
        name: '',
        surname: '',
        date_of_birth: '',
        gender: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
        idCard: null,
        profilePhoto: null,

        // Health Information
        blood_type: '',
        allergies: '',
        chronic_conditions: '',
        medications: '',
        height: '',
        weight: '',

        // Emergency Contact
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: '',

        // Health Questions
        has_heart_problems: null,
        chest_pain_activity: null,
        balance_dizziness: null,
        other_chronic_disease: null,
        prescribed_medication: null,
        bone_joint_issues: null,
        doctor_supervised_activity: null,

        // Terms
        terms_accepted: false,
        privacy_accepted: false,
        marketing_accepted: false,
    });

    const [isSocialRegistration, setIsSocialRegistration] = useState(isFromSocial);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [registrationComplete, setRegistrationComplete] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);

    // New: track which steps (0-based) are fully completed
    const [completedSteps, setCompletedSteps] = useState([]);

    const steps = [
        "Personal Info",
        "Health Info",
        "Health Questions",
        "Emergency Contact",
        "Terms"
    ];

    useEffect(() => {
        if (isFromSocial) {
            const urlParams = new URLSearchParams(window.location.search);
            const error = urlParams.get('error');
            
            if (error === 'EMAIL_IN_USE') {
                setShowErrorModal(true);
            } else {
                // Set personal info data from social registration
                setFormData(prev => ({
                    ...prev,
                    name: sessionStorage.getItem('socialName') || '',
                    surname: sessionStorage.getItem('socialSurname') || '',
                    email: sessionStorage.getItem('socialEmail') || '',
                    // Any other social data you want to pre-fill
                }));
                setIsSocialRegistration(true);
                // Always start from step 1 (Personal Info)
                setCurrentStep(1);
            }
        }
    }, [isFromSocial]);

    useEffect(() => {
        const fetchSocialData = async () => {
            if (isFromSocial) {
                try {
                    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
                    const response = await fetch(`${apiUrl}/auth/social-registration-data`, {
                        credentials: 'include'
                    });
                    const socialData = await response.json();
                    
                    if (socialData) {
                        setFormData(prev => ({
                            ...prev,
                            name: socialData.given_name || '',
                            surname: socialData.family_name || '',
                            email: socialData.email || '',
                            // Don't set password fields for social registration
                            profile_picture: socialData.picture || null,
                            provider: socialData.provider || 'Social Media'
                        }));
                    }
                } catch (error) {
                    console.error('Error fetching social data:', error);
                }
            }
        };

        fetchSocialData();
    }, [isFromSocial]);

    const handleCloseErrorModal = () => {
        setShowErrorModal(false);
        window.location.href = '/login';
    };

    const validateStep = (step) => {
        const validationErrors = validateFormStep(step, { ...formData, isSocialRegistration });
        setErrors(validationErrors);
        return Object.keys(validationErrors).length === 0;
    };

    const handleStepClick = (stepNumber) => {
        setCurrentStep(stepNumber);
    };

    const nextStep = () => {
        // Validate current step (which is 1-based)
        if (validateStep(currentStep)) {
            // Mark the current step (0-based) as completed
            const currentIndex = currentStep - 1;
            setCompletedSteps(prev => {
                // Add currentIndex to the array if not already present
                return prev.includes(currentIndex)
                    ? prev
                    : [...prev, currentIndex];
            });

            // Move on to the next step
            setCurrentStep(currentStep + 1);
            window.scrollTo(0, 0);
        }
    };

    const prevStep = () => {
        setCurrentStep(currentStep - 1);
        window.scrollTo(0, 0);
    };

    // Determine if a given 0-based step index is completed
    const isStepCompleted = (stepIndex) => {
        return completedSteps.includes(stepIndex);
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : 
                    type === 'file' ? files[0] : 
                    value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async () => {
        if (validateStep(currentStep)) {
            setIsSubmitting(true);
            try {
                const formDataToSend = new FormData();
                
                // Append all form data
                Object.keys(formData).forEach(key => {
                    if (key === 'idCard' || key === 'profilePhoto') {
                        if (formData[key]) {
                            formDataToSend.append(key, formData[key]);
                        }
                    } else {
                        formDataToSend.append(key, formData[key]);
                    }
                });

                // Add social registration info if applicable
                if (isSocialRegistration) {
                    formDataToSend.append('isSocialRegistration', true);
                }

                const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
                const response = await fetch(`${apiUrl}/auth/register`, {
                    method: 'POST',
                    body: formDataToSend,
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Registration failed');
                }

                // Registration successful - verification email will be sent from backend
                setRegistrationComplete(true);
            } catch (error) {
                setErrors(prev => ({
                    ...prev,
                    submit: 'Registration failed. Please try again.'
                }));
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return (
                    <PersonalInfoStep 
                        formData={formData}
                        handleInputChange={handleInputChange}
                        nextStep={nextStep}
                        errors={errors}
                        setErrors={setErrors}
                        isSocialRegistration={isSocialRegistration}
                    />
                );
            case 2:
                return (
                    <HealthInfoStep 
                        formData={formData}
                        handleInputChange={handleInputChange}
                        nextStep={nextStep}
                        prevStep={prevStep}
                        errors={errors}
                        setErrors={setErrors}
                    />
                );
            case 3:
                return (
                    <HealthQuestionsStep 
                        formData={formData}
                        handleInputChange={handleInputChange}
                        nextStep={nextStep}
                        prevStep={prevStep}
                        errors={errors}
                        setErrors={setErrors}
                    />
                );
            case 4:
                return (
                    <EmergencyContactStep 
                        formData={formData}
                        handleInputChange={handleInputChange}
                        nextStep={nextStep}
                        prevStep={prevStep}
                        errors={errors}
                        setErrors={setErrors}
                    />
                );
            case 5:
                return (
                    <TermsStep 
                        formData={formData}
                        handleInputChange={handleInputChange}
                        prevStep={prevStep}
                        handleSubmit={handleSubmit}
                        errors={errors}
                        setErrors={setErrors}
                        isSubmitting={isSubmitting}
                    />
                );
            default:
                return null;
        }
    };

    // Component to show on successful registration
    const RegistrationSuccess = ({ onLoginClick }) => {
        return (
            <div className="registration-success">
                <div className="success-icon">
                    <svg viewBox="0 0 24 24" className="checkmark">
                        <path 
                            fill="none" 
                            d="M7,13l3,3l7-7" 
                            stroke="#fff" 
                            strokeWidth="2"
                        />
                    </svg>
                </div>
                <h2>Registration Complete!</h2>
                <p>Your account has been successfully created. Please verify your email before logging in.</p>
                <button className="login-button" onClick={onLoginClick}>
                    Go to Login
                    <span className="arrow">→</span>
                </button>
            </div>
        );
    };

    if (registrationComplete) {
        return (
            <RegistrationSuccess onLoginClick={() => window.location.href = '/login'} />
        );
    }

    return (
        <div className="multi-step-form">
            <Link to="/" className="register-page-logo">Swim Center</Link>
            <ProgressBar
                currentStep={currentStep - 1}        // 0-based for ProgressBar
                steps={steps}
                handleStepClick={handleStepClick}
                errors={errors}
                formData={formData}
                isSocialRegistration={isSocialRegistration}
                isStepCompleted={isStepCompleted}
            />

            {errors.submit && (
                <div className="error-message">
                    {errors.submit}
                </div>
            )}

            {isSubmitting && (
                <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                </div>
            )}

            {showErrorModal && (
                <div className="error-modal-overlay">
                    <div className="error-modal">
                        <div className="error-modal-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="15" y1="9" x2="9" y2="15" />
                                <line x1="9" y1="9" x2="15" y2="15" />
                            </svg>
                        </div>
                        <h2>Already Registered</h2>
                        <p>This email is already registered. Please login with your existing account.</p>
                        <button onClick={handleCloseErrorModal}>
                            Go to Login
                        </button>
                    </div>
                </div>
            )}

            {renderStep()}
        </div>
    );
};

export default MultiStepForm;
