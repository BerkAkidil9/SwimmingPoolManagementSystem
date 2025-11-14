import React from 'react';
import { Link } from 'react-router-dom';
import { validateTerms } from '../../../utils/validations';
import './TermsStep.css';

const TermsStep = ({ formData, handleInputChange, prevStep, handleSubmit: submitForm, errors, setErrors, isSubmitting }) => {
    const validateField = (name, checked) => {
        const fieldValue = { [name]: checked };
        const fieldErrors = {};

        switch (name) {
            case 'terms_accepted':
                if (!checked) {
                    fieldErrors.terms_accepted = "You must accept the terms and conditions";
                }
                break;

            case 'privacy_accepted':
                if (!checked) {
                    fieldErrors.privacy_accepted = "You must accept the privacy policy";
                }
                break;

            // No validation needed for marketing_accepted as it's optional
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
        const { name, checked } = e.target;
        handleInputChange(e);
        validateField(name, checked);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const validationErrors = validateTerms(formData);
        
        if (Object.keys(validationErrors).length === 0) {
            submitForm();
        } else {
            setErrors(validationErrors);
            const firstError = document.querySelector('.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    return (
        <div className="form-step">
            <h2 className="form-section-header">Terms and Conditions</h2>
            
            <form onSubmit={handleSubmit}>
                <div className="terms-checkboxes">
                    <div className="checkbox-group">
                        <label className="required-field">
                            <Link to="/terms" target="_blank" rel="noopener noreferrer">
                                Terms and Conditions
                            </Link>
                        </label>
                        <input
                            type="checkbox"
                            name="terms_accepted"
                            checked={formData.terms_accepted}
                            onChange={handleChange}
                        />
                        {errors?.terms_accepted && (
                            <span className="error">{errors.terms_accepted}</span>
                        )}
                    </div>

                    <div className="checkbox-group">
                        <label className="required-field">
                            <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer">
                                Privacy Policy
                            </Link>
                        </label>
                        <input
                            type="checkbox"
                            name="privacy_accepted"
                            checked={formData.privacy_accepted}
                            onChange={handleChange}
                        />
                        {errors?.privacy_accepted && (
                            <span className="error">{errors.privacy_accepted}</span>
                        )}
                    </div>

                    <div className="checkbox-group">
                        <label>
                            Marketing Communications (Optional)
                        </label>
                        <input
                            type="checkbox"
                            name="marketing_accepted"
                            checked={formData.marketing_accepted}
                            onChange={handleChange}
                        />
                    </div>

                    <div className="terms-content">
                        <p style={{ color: '#000000' }}>
                            By accepting these terms, you acknowledge that:
                        </p>
                        <ul style={{ color: '#000000' }}>
                            <li>All provided information is accurate and complete</li>
                            <li>You are at least 18 years old</li>
                            <li>You understand the health risks associated with swimming activities</li>
                            <li>You agree to follow all pool safety rules and regulations</li>
                        </ul>
                    </div>
                </div>

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
                        className="nav-button next-button submit-button"
                        disabled={isSubmitting || !formData.terms_accepted || !formData.privacy_accepted}
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TermsStep;
