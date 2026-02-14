import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SocialLogin from '../../../SocialLogin';
import './PersonalInfo.css';
import { FaUser, FaPhone, FaCalendarAlt, FaVenusMars, FaEnvelope, FaIdCard, FaCamera, FaSwimmer, FaKey, FaEye, FaEyeSlash } from 'react-icons/fa';
import { checkEmailUnique, checkPhoneUnique, validatePersonalInfo } from '../../../utils/validations';

const PersonalInfoStep = ({ formData, handleInputChange, nextStep, errors, setErrors, isSocialRegistration }) => {
    const [idCardPreview, setIdCardPreview] = useState(null);
    const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);

    useEffect(() => {
        if (formData.profile_picture && isSocialRegistration) {
            setProfilePhotoPreview(formData.profile_picture);
            handleInputChange({
                target: {
                    name: 'profilePhoto',
                    value: formData.profile_picture,
                    type: 'socialPhoto'
                }
            });
        }
    }, [formData.profile_picture, isSocialRegistration]);

    const formatPhoneNumber = (value) => {
        const phoneNumber = value.replace(/\D/g, '');
        if (phoneNumber.length >= 10) {
            return phoneNumber.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1-$2-$3-$4');
        }
        return phoneNumber;
    };

    const handlePhoneChange = (e) => {
        const formattedNumber = formatPhoneNumber(e.target.value);
        handleInputChange({
            target: {
                name: 'phone',
                value: formattedNumber
            }
        });
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (type === 'profilePhoto' && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setProfilePhotoPreview(reader.result);
                };
                reader.readAsDataURL(file);
            }
            
            if (type === 'idCard' && file.type === 'application/pdf') {
                setIdCardPreview(file.name);
            }

            handleInputChange({
                target: {
                    name: type,
                    type: 'file',
                    files: [file]
                }
            });
        }
    };

    const handleKeyEvent = (e) => {
        setCapsLockOn(e.getModifierState('CapsLock'));
    };

    const validateField = async (name, value) => {
        // Skip instant validation for email and phone
        if (name === 'email' || name === 'phone') {
            return true;
        }

        const fieldValue = { [name]: value };
        const fieldErrors = {};

        switch (name) {
            case 'name':
                if (!value) {
                    fieldErrors.name = "Name is required";
                } else if (value.length < 2) {
                    fieldErrors.name = "Name must be at least 2 characters";
                } else if (!/^[A-Za-zğüşıöçĞÜŞİÖÇ\s]{2,50}$/.test(value)) {
                    fieldErrors.name = "Name can only contain letters and spaces";
                }
                break;

            case 'surname':
                if (!value) {
                    fieldErrors.surname = "Surname is required";
                } else if (value.length < 2) {
                    fieldErrors.surname = "Surname must be at least 2 characters";
                } else if (!/^[A-Za-zğüşıöçĞÜŞİÖÇ\s]{2,50}$/.test(value)) {
                    fieldErrors.surname = "Surname can only contain letters and spaces";
                }
                break;

            case 'date_of_birth':
                if (!value) {
                    fieldErrors.date_of_birth = "Date of birth is required";
                } else {
                    const birthDate = new Date(value);
                    const today = new Date();
                    const age = today.getFullYear() - birthDate.getFullYear();
                    if (age < 18) {
                        fieldErrors.date_of_birth = "You must be at least 18 years old";
                    } else if (age > 100) {
                        fieldErrors.date_of_birth = "Please enter a valid date of birth";
                    }
                }
                break;

            case 'gender':
                if (!value) {
                    fieldErrors.gender = "Gender is required";
                }
                break;

            case 'swimming_ability':
                if (!value) {
                    fieldErrors.swimming_ability = "Swimming ability is required";
                }
                break;

            case 'password':
                if (!isSocialRegistration) {
                    if (!value) {
                        fieldErrors.password = "Password is required";
                    } else {
                        if (value.length < 8) {
                            fieldErrors.password = "Password must be at least 8 characters";
                        } else if (!/[A-Z]/.test(value)) {
                            fieldErrors.password = "Password must contain at least one uppercase letter";
                        } else if (!/[a-z]/.test(value)) {
                            fieldErrors.password = "Password must contain at least one lowercase letter";
                        } else if (!/[0-9]/.test(value)) {
                            fieldErrors.password = "Password must contain at least one number";
                        }
                    }
                    // Also validate confirmPassword when password changes
                    if (formData.confirmPassword) {
                        if (value !== formData.confirmPassword) {
                            setErrors(prev => ({
                                ...prev,
                                confirmPassword: "Passwords do not match"
                            }));
                        } else {
                            setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.confirmPassword;
                                return newErrors;
                            });
                        }
                    }
                }
                break;

            case 'confirmPassword':
                if (!isSocialRegistration) {
                    if (!value) {
                        fieldErrors.confirmPassword = "Please confirm your password";
                    } else if (value !== formData.password) {
                        fieldErrors.confirmPassword = "Passwords do not match";
                    }
                }
                break;
        }

        if (Object.keys(fieldErrors).length > 0) {
            setErrors(prev => ({
                ...prev,
                ...fieldErrors
            }));
            return false;
        } else {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
            return true;
        }
    };

    const handleChange = async (e) => {
        const { name, value } = e.target;
        handleInputChange(e);
        await validateField(name, value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate all fields before proceeding
        const validationErrors = await validatePersonalInfo(formData, isSocialRegistration);
        
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
        <div className="form-step personal-info-step">
            <h2 className="form-section-header">Personal Information</h2>
            
            <form onSubmit={handleSubmit}>
                {/* Basic Information Section */}
                <div className="form-section">
                    <div className="form-group">
                        <label htmlFor="name" className="required-field"><FaUser /> Name:</label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter your name"
                        />
                        {errors?.name && <span className="error">{errors.name}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="surname" className="required-field"><FaUser /> Surname:</label>
                        <input
                            type="text"
                            id="surname"
                            name="surname"
                            value={formData.surname}
                            onChange={handleChange}
                            placeholder="Enter your surname"
                        />
                        {errors?.surname && <span className="error">{errors.surname}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="date_of_birth" className="required-field"><FaCalendarAlt /> Date of Birth:</label>
                        <input
                            type="date"
                            id="date_of_birth"
                            name="date_of_birth"
                            value={formData.date_of_birth}
                            onChange={handleChange}
                        />
                        {errors?.date_of_birth && <span className="error">{errors.date_of_birth}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="gender" className="required-field"><FaVenusMars /> Gender:</label>
                        <select
                            id="gender"
                            name="gender"
                            value={formData.gender}
                            onChange={handleChange}
                        >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                        {errors?.gender && <span className="error">{errors.gender}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="swimming_ability" className="required-field"><FaSwimmer /> Swimming Ability:</label>
                        <select
                            id="swimming_ability"
                            name="swimming_ability"
                            value={formData.swimming_ability}
                            onChange={handleChange}
                        >
                            <option value="">Can you swim?</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                        </select>
                        {errors?.swimming_ability && <span className="error">{errors.swimming_ability}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="phone" className="required-field"><FaPhone /> Phone Number:</label>
                        <input
                            type="tel"
                            id="phone"
                            name="phone"
                            value={formData.phone}
                            onChange={handlePhoneChange}
                            placeholder="05XX-XXX-XX-XX"
                            maxLength="14"
                        />
                        {errors?.phone && <span className="error">{errors.phone}</span>}
                    </div>
                </div>
                                {/* Account Information Section */}
                                <div className="form-section">
                    <div className="form-group">
                        <label htmlFor="email" className="required-field"><FaEnvelope /> Email:</label>
                        <div className="email-input-container">
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                disabled={isSocialRegistration}
                                className={isSocialRegistration ? 'social-email-input' : ''}
                            />
                            {isSocialRegistration && (
                                <div className="social-email-badge">
                                    <i className="fas fa-lock"></i>
                                </div>
                            )}
                        </div>
                        {errors?.email && <span className="error">{errors.email}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="required-field"><FaKey /> Password:</label>
                        <div className="password-input-container">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                onKeyDown={handleKeyEvent}
                                onKeyUp={handleKeyEvent}
                                onCopy={(e) => e.preventDefault()}
                                onPaste={(e) => e.preventDefault()}
                                onCut={(e) => e.preventDefault()}
                                className={errors?.password ? "error-input" : ""}
                                disabled={isSocialRegistration}
                                placeholder={isSocialRegistration ? "No password needed with social login" : "Enter your password"}
                            />
                            {capsLockOn && !isSocialRegistration && (
                                <div className="caps-lock-warning">
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M7.27 1.047a1 1 0 0 1 1.46 0l6.345 6.77c.6.638.146 1.683-.73 1.683H11.5v1a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1H1.654C.78 9.5.326 8.455.924 7.816L7.27 1.047zM4.5 13.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1z"/>
                                    </svg>
                                    CAPS
                                </div>
                            )}
                            {!isSocialRegistration && (
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            )}
                            {isSocialRegistration && (
                                <div className="social-email-badge">
                                    <i className="fas fa-lock"></i>
                                </div>
                            )}
                        </div>
                        {errors?.password && <span className="error">{errors.password}</span>}
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="required-field"><FaKey /> Confirm Password:</label>
                        <div className="password-input-container">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                onKeyDown={handleKeyEvent}
                                onKeyUp={handleKeyEvent}
                                onCopy={(e) => e.preventDefault()}
                                onPaste={(e) => e.preventDefault()}
                                onCut={(e) => e.preventDefault()}
                                className={errors?.confirmPassword ? "error-input" : ""}
                                disabled={isSocialRegistration}
                                placeholder={isSocialRegistration ? "No password needed with social login" : "Confirm your password"}
                            />
                            {capsLockOn && !isSocialRegistration && (
                                <div className="caps-lock-warning">
                                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                        <path d="M7.27 1.047a1 1 0 0 1 1.46 0l6.345 6.77c.6.638.146 1.683-.73 1.683H11.5v1a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1H1.654C.78 9.5.326 8.455.924 7.816L7.27 1.047zM4.5 13.5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-1z"/>
                                    </svg>
                                    CAPS
                                </div>
                            )}
                            {!isSocialRegistration && (
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            )}
                            {isSocialRegistration && (
                                <div className="social-email-badge">
                                    <i className="fas fa-lock"></i>
                                </div>
                            )}
                        </div>
                        {errors?.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
                    </div>

                    <div className="file-upload-section">
                        <h3 className="sub-section-header">Document Upload</h3>
                        
                        <div className="file-upload-container">
                            <div className="form-group">
                                <label htmlFor="idCard" className="required-field"><FaIdCard /> ID Card (PDF only):</label>
                                <div className="file-upload">
                                    <label className="file-upload-label">
                                        <input
                                            type="file"
                                            id="idCard"
                                            accept=".pdf"
                                            onChange={(e) => handleFileChange(e, 'idCard')}
                                        />
                                        <i className="fas fa-file-pdf"></i>
                                        {idCardPreview || 'Choose ID Card PDF'}
                                    </label>
                                </div>
                                {errors?.idCard && <span className="error">{errors.idCard}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="profilePhoto" className="required-field"><FaCamera /> Profile Photo:</label>
                                <div className="file-upload">
                                    <label className="file-upload-label">
                                        <input
                                            type="file"
                                            id="profilePhoto"
                                            accept="image/*"
                                            onChange={(e) => handleFileChange(e, 'profilePhoto')}
                                        />
                                        <i className="fas fa-camera"></i>
                                        {profilePhotoPreview ? 'Change Photo' : 'Choose Profile Photo'}
                                    </label>
                                </div>
                                {profilePhotoPreview && (
                                    <div className="preview-container">
                                        <img
                                            src={profilePhotoPreview}
                                            alt="Profile Preview"
                                            className="profile-photo-preview"
                                            onError={(e) => {
                                                console.error('Image failed to load:', e);
                                                setProfilePhotoPreview(null);
                                            }}
                                        />
                                        {isSocialRegistration && formData.profile_picture === profilePhotoPreview && (
                                            <span className="social-photo-badge">
                                                From {formData.provider || 'Social Media'} Profile
                                            </span>
                                        )}
                                    </div>
                                )}
                                {errors?.profilePhoto && (
                                    <span className="error">{errors.profilePhoto}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="form-navigation">
                    <span className="already-have-account-inline">
                        Already have an account? <Link to="/login">Log in</Link>
                    </span>
                    <button type="submit" className="nav-button next-button">
                        Next
                    </button>
                </div>
            </form>

            {!isSocialRegistration && (
                <>
                    <div className="social-login-separator">
                        <span>or</span>
                    </div>

                    <div className="social-login-container">
                        <SocialLogin />
                    </div>
                </>
            )}
        </div>
    );
};

export default PersonalInfoStep;