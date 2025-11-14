import React from 'react';
import { FaUser, FaPhone, FaUserFriends } from 'react-icons/fa';
import { validateEmergencyContact } from '../../../utils/validations';
// import './Steps.css';
import './EmergencyContact.css';

const EmergencyContactStep = ({ formData, handleInputChange, nextStep, prevStep, errors, setErrors }) => {
    const validateField = (name, value) => {
        // Skip instant validation for emergency contact phone
        if (name === 'emergency_contact_phone') {
            return true;
        }

        const fieldValue = { [name]: value };
        const fieldErrors = {};

        switch (name) {
            case 'emergency_contact_name':
                if (!value) {
                    fieldErrors.emergency_contact_name = "Emergency contact name is required";
                } else if (value.length < 2) {
                    fieldErrors.emergency_contact_name = "Name must be at least 2 characters";
                } else if (!/^[A-Za-zğüşıöçĞÜŞİÖÇ\s]{2,50}$/.test(value)) {
                    fieldErrors.emergency_contact_name = "Name can only contain letters and spaces";
                }
                break;

            case 'emergency_contact_relationship':
                if (!value) {
                    fieldErrors.emergency_contact_relationship = "Please specify the relationship";
                }
                break;

            case 'emergency_contact_relationship_other':
                if (formData.emergency_contact_relationship === 'other' && !value?.trim()) {
                    fieldErrors.emergency_contact_relationship_other = "Please specify the relationship";
                } else if (value?.length > 50) {
                    fieldErrors.emergency_contact_relationship_other = "Relationship description is too long (max 50 characters)";
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

    const handleSubmit = (e) => {
        e.preventDefault();
        const validationErrors = validateEmergencyContact(formData);
        
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

    // Phone number formatter
    const formatPhoneNumber = (value) => {
        // Remove all non-digits
        const phoneNumber = value.replace(/\D/g, '');
        
        // Format as 05XX-XXX-XX-XX
        if (phoneNumber.length >= 10) {
            return phoneNumber.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1-$2-$3-$4');
        }
        return phoneNumber;
    };

    const handlePhoneChange = (e) => {
        const formattedNumber = formatPhoneNumber(e.target.value);
        handleInputChange({
            target: {
                name: 'emergency_contact_phone',
                value: formattedNumber
            }
        });
        validateField('emergency_contact_phone', formattedNumber);
    };

    const relationships = [
        { value: 'parent', label: 'Parent' },
        { value: 'spouse', label: 'Spouse' },
        { value: 'sibling', label: 'Sibling' },
        { value: 'child', label: 'Child' },
        { value: 'friend', label: 'Friend' },
        { value: 'other', label: 'Other' }
    ];

    return (
        <div className="form-step emergency-contact-step">
            <h2 className="form-section-header">Emergency Contact Information</h2>
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="emergency_contact_name" className="required-field">
                        <FaUser /> Emergency Contact Name:
                    </label>
                    <input
                        type="text"
                        id="emergency_contact_name"
                        name="emergency_contact_name"
                        value={formData.emergency_contact_name}
                        onChange={handleChange}
                        placeholder="Enter emergency contact's full name"
                    />
                    {errors?.emergency_contact_name && (
                        <span className="error">{errors.emergency_contact_name}</span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="emergency_contact_phone" className="required-field">
                        <FaPhone /> Emergency Contact Phone:
                    </label>
                    <input
                        type="tel"
                        id="emergency_contact_phone"
                        name="emergency_contact_phone"
                        value={formData.emergency_contact_phone}
                        onChange={handlePhoneChange}
                        placeholder="05XX-XXX-XX-XX"
                        maxLength="14" // Including hyphens
                    />
                    {errors?.emergency_contact_phone && (
                        <span className="error">{errors.emergency_contact_phone}</span>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="emergency_contact_relationship" className="required-field">
                        <FaUserFriends /> Relationship:
                    </label>
                    <select
                        id="emergency_contact_relationship"
                        name="emergency_contact_relationship"
                        value={formData.emergency_contact_relationship}
                        onChange={handleChange}
                    >
                        <option value="">Select relationship</option>
                        {relationships.map(rel => (
                            <option key={rel.value} value={rel.value}>
                                {rel.label}
                            </option>
                        ))}
                    </select>
                    {errors?.emergency_contact_relationship && (
                        <span className="error">{errors.emergency_contact_relationship}</span>
                    )}
                </div>

                {formData.emergency_contact_relationship === 'other' && (
                    <div className="form-group">
                        <label htmlFor="emergency_contact_relationship_other" className="required-field">
                            Specify Relationship:
                        </label>
                        <input
                            type="text"
                            id="emergency_contact_relationship_other"
                            name="emergency_contact_relationship_other"
                            value={formData.emergency_contact_relationship_other || ''}
                            onChange={handleChange}
                            placeholder="Please specify the relationship"
                        />
                        {errors?.emergency_contact_relationship_other && (
                            <span className="error">{errors.emergency_contact_relationship_other}</span>
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

export default EmergencyContactStep; 