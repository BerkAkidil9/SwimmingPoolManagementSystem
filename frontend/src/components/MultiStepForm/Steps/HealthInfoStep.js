import React from 'react';
import { FaHeartbeat, FaRulerVertical, FaWeight, FaAllergies, FaMedkit, FaNotesMedical } from 'react-icons/fa';
import { validateHealthInfo } from '../../../utils/validations';
import './HealthInfo.css';

const HealthInfoStep = ({ formData, handleInputChange, nextStep, prevStep, errors, setErrors }) => {
    const validateField = (name, value) => {
        const fieldValue = { [name]: value };
        const fieldErrors = {};

        switch (name) {
            case 'height':
                if (!value) {
                    fieldErrors.height = "Height is required";
                } else {
                    const height = Number(value);
                    if (isNaN(height) || height < 100 || height > 250) {
                        fieldErrors.height = "Please enter a valid height (100-250 cm)";
                    }
                }
                break;

            case 'weight':
                if (!value) {
                    fieldErrors.weight = "Weight is required";
                } else {
                    const weight = Number(value);
                    if (isNaN(weight) || weight < 30 || weight > 300) {
                        fieldErrors.weight = "Please enter a valid weight (30-300 kg)";
                    }
                }
                break;

            case 'blood_type':
                if (!value) {
                    fieldErrors.blood_type = "Blood type is required";
                } else if (!['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(value)) {
                    fieldErrors.blood_type = "Please select a valid blood type";
                }
                break;

            case 'allergies':
                if (value?.length > 500) {
                    fieldErrors.allergies = "Allergies description is too long (max 500 characters)";
                }
                break;

            case 'chronic_conditions':
                if (value?.length > 500) {
                    fieldErrors.chronic_conditions = "Chronic conditions description is too long (max 500 characters)";
                }
                break;

            case 'medications':
                if (value?.length > 500) {
                    fieldErrors.medications = "Medications list is too long (max 500 characters)";
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
        const validationErrors = validateHealthInfo(formData);
        
        if (Object.keys(validationErrors).length === 0) {
            nextStep();
        } else {
            setErrors(validationErrors);
            // Scroll to first error
            const firstError = document.querySelector('.error');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    return (
        <div className="form-step health-info-step">
            <h2 className="form-section-header">Health Information</h2>
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="blood_type" className="required-field"><FaHeartbeat /> Blood Type:</label>
                    <select
                        id="blood_type"
                        name="blood_type"
                        value={formData.blood_type}
                        onChange={handleChange}
                    >
                        <option value="">Select blood type</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                    </select>
                    {errors?.blood_type && <span className="error">{errors.blood_type}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="height" className="required-field"><FaRulerVertical /> Height (cm):</label>
                    <input
                        type="number"
                        id="height"
                        name="height"
                        value={formData.height}
                        onChange={handleChange}
                        placeholder="Valid range: 100-250 cm"
                        min="100"
                        max="250"
                    />
                    {errors?.height && <span className="error">{errors.height}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="weight" className="required-field"><FaWeight /> Weight (kg):</label>
                    <input
                        type="number"
                        id="weight"
                        name="weight"
                        value={formData.weight}
                        onChange={handleChange}
                        placeholder="Valid range: 30-300 kg"
                        min="30"
                        max="300"
                    />
                    {errors?.weight && <span className="error">{errors.weight}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="allergies"><FaAllergies /> Allergies:</label>
                    <textarea
                        id="allergies"
                        name="allergies"
                        value={formData.allergies}
                        onChange={handleChange}
                        placeholder="List any allergies you have (optional)"
                        maxLength="500"
                    ></textarea>
                    {errors?.allergies && <span className="error">{errors.allergies}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="chronic_conditions"><FaNotesMedical /> Chronic Conditions:</label>
                    <textarea
                        id="chronic_conditions"
                        name="chronic_conditions"
                        value={formData.chronic_conditions}
                        onChange={handleChange}
                        placeholder="List any chronic conditions you have (optional)"
                        maxLength="500"
                    ></textarea>
                    {errors?.chronic_conditions && <span className="error">{errors.chronic_conditions}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="medications"><FaMedkit /> Medications:</label>
                    <textarea
                        id="medications"
                        name="medications"
                        value={formData.medications}
                        onChange={handleChange}
                        placeholder="List any medications you take regularly (optional)"
                        maxLength="500"
                    ></textarea>
                    {errors?.medications && <span className="error">{errors.medications}</span>}
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
                        className="nav-button next-button"
                    >
                        Next
                    </button>
                </div>
            </form>
        </div>
    );
};

export default HealthInfoStep;