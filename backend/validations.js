// Constants and patterns
const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^05\d{2}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2}$/, // Turkish phone format
    name: /^[A-Za-zğüşıöçĞÜŞİÖÇ\s]+$/, // Turkish characters included
};

const validateFiles = (files, errors) => {
    console.log('=== File Validation Start ===');
    console.log('Files received:', files);

    if (!files) {
        errors.idCard = 'ID card is required';
        errors.profilePhoto = 'Profile photo is required';
        console.log('No files found');
        return;
    }

    // Validate ID Card
    if (!files.idCard || !files.idCard[0]) {
        errors.idCard = 'ID card is required';
    } else {
        const idCard = files.idCard[0];
        if (idCard.mimetype !== 'application/pdf') {
            errors.idCard = 'ID card must be a PDF file';
        }
        if (idCard.size > 5 * 1024 * 1024) { // 5MB
            errors.idCard = 'ID card must be less than 5MB';
        }
    }

    // Validate Profile Photo
    if (!files.profilePhoto || !files.profilePhoto[0]) {
        errors.profilePhoto = 'Profile photo is required';
    } else {
        const profilePhoto = files.profilePhoto[0];
        if (!profilePhoto.mimetype.startsWith('image/')) {
            errors.profilePhoto = 'Profile photo must be an image file';
        }
        if (profilePhoto.size > 5 * 1024 * 1024) { // 5MB
            errors.profilePhoto = 'Profile photo must be less than 5MB';
        }
    }

    console.log('File Validation Errors:', errors);
    console.log('=== File Validation End ===');
};

const validateRegistration = (formData, files, socialUser) => {
    console.log('=== Registration Validation Start ===');
    console.log('Form data:', formData);
    console.log('Files:', files);
    console.log('Social user:', socialUser);

    const errors = {};

    // Skip personal info validation for social registration
    if (!socialUser) {
        validatePersonalInfo(formData, errors);
        validateFiles(files, errors);
    } else {
        // For social registration, only validate required fields not provided by social login
        validatePersonalInfo(formData, errors, socialUser);
        // Still validate ID card
        if (!files?.idCard?.[0]) {
            errors.idCard = "ID Card is required";
        }
    }

    validateHealthInfo(formData, errors);
    validateHealthQuestions(formData, errors);
    validateEmergencyContact(formData, errors);
    validateTerms(formData, errors);

    console.log('Final validation errors:', errors);
    console.log('=== Registration Validation End ===');

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

const validatePersonalInfo = (formData, errors, socialUser) => {
    console.log('=== Personal Info Validation Start ===');
    
    // Name validation
    if (!formData.name) {
        errors.name = 'Name is required';
    } else if (formData.name.length < 2) {
        errors.name = 'Name must be at least 2 characters';
    } else if (!patterns.name.test(formData.name)) {
        errors.name = 'Name can only contain letters';
    }

    // Surname validation
    if (!formData.surname) {
        errors.surname = 'Surname is required';
    } else if (formData.surname.length < 2) {
        errors.surname = 'Surname must be at least 2 characters';
    } else if (!patterns.name.test(formData.surname)) {
        errors.surname = 'Surname can only contain letters';
    }

    // Email validation
    if (!formData.email) {
        errors.email = 'Email is required';
    } else if (!patterns.email.test(formData.email)) {
        errors.email = 'Invalid email format';
    }

    // Phone validation
    if (!formData.phone) {
        errors.phone = 'Phone number is required';
    } else if (!patterns.phone.test(formData.phone)) {
        errors.phone = 'Invalid phone format (05XX-XXX-XX-XX)';
    }

    // Date of birth validation
    if (!formData.date_of_birth) {
        errors.date_of_birth = 'Date of birth is required';
    } else {
        const birthDate = new Date(formData.date_of_birth);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        if (age < 18) {
            errors.date_of_birth = 'You must be at least 18 years old';
        }
    }

    // Gender validation
    if (!formData.gender) {
        errors.gender = 'Gender is required';
    }

    // Swimming ability validation
    if (!formData.swimming_ability) {
        errors.swimming_ability = 'Swimming ability status is required';
    }

    // Password validation (if not social registration)
    if (!formData.isSocialRegistration) {
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        } else if (formData.password.length > 128) {
            errors.password = 'Password must be at most 128 characters';
        } else if (!/[A-Z]/.test(formData.password)) {
            errors.password = 'Password must contain at least one uppercase letter';
        } else if (!/[a-z]/.test(formData.password)) {
            errors.password = 'Password must contain at least one lowercase letter';
        } else if (!/\d/.test(formData.password)) {
            errors.password = 'Password must contain at least one number';
        }

        if (!formData.confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
    }

    console.log('Personal Info Validation Errors:', errors);
    console.log('=== Personal Info Validation End ===');
};

const validateHealthInfo = (values, errors) => {
    console.log('=== Health Info Validation Start ===');
    
    // Height validation
    if (!values.height) {
        errors.height = 'Height is required';
    } else {
        const height = Number(values.height);
        if (isNaN(height) || height < 100 || height > 250) {
            errors.height = 'Please enter a valid height (100-250 cm)';
        }
    }

    // Weight validation
    if (!values.weight) {
        errors.weight = 'Weight is required';
    } else {
        const weight = Number(values.weight);
        if (isNaN(weight) || weight < 30 || weight > 300) {
            errors.weight = 'Please enter a valid weight (30-300 kg)';
        }
    }

    // Blood type validation
    if (!values.blood_type) {
        errors.blood_type = 'Blood type is required';
    }

    // Allergies (optional field)
    if (values.allergies && values.allergies.length > 500) {
        errors.allergies = 'Allergies description is too long (max 500 characters)';
    }

    console.log('Health Info Validation Errors:', errors);
    console.log('=== Health Info Validation End ===');
};

const validateEmergencyContact = (values, errors) => {
    console.log('=== Emergency Contact Validation Start ===');
    
    // Emergency contact name validation
    if (!values.emergency_contact_name) {
        errors.emergency_contact_name = 'Emergency contact name is required';
    } else if (values.emergency_contact_name.length < 2) {
        errors.emergency_contact_name = 'Name must be at least 2 characters';
    }

    // Emergency contact phone validation
    if (!values.emergency_contact_phone) {
        errors.emergency_contact_phone = 'Emergency contact phone is required';
    } else if (!patterns.phone.test(values.emergency_contact_phone)) {
        errors.emergency_contact_phone = 'Invalid phone format (05XX-XXX-XX-XX)';
    } else if (values.emergency_contact_phone === values.phone) {
        errors.emergency_contact_phone = 'Emergency contact phone cannot be same as your phone';
    }

    // Relationship validation
    if (!values.emergency_contact_relationship) {
        errors.emergency_contact_relationship = 'Please specify the relationship';
    }

    console.log('Emergency Contact Validation Errors:', errors);
    console.log('=== Emergency Contact Validation End ===');
};

const validateHealthQuestions = (values, errors) => {
    console.log('=== Health Questions Validation Start ===');
    
    // Required health questions
    const requiredQuestions = [
        'has_heart_problems',
        'chest_pain_activity',
        'balance_dizziness',
        'other_chronic_disease',
        'prescribed_medication',
        'bone_joint_issues',
        'doctor_supervised_activity'
    ];

    // Check if all questions are answered
    requiredQuestions.forEach(question => {
        if (values[question] === null || values[question] === undefined) {
            errors[question] = 'Please answer this question';
        }
    });

    // If any health condition is marked as true, additional info is required
    const hasHealthCondition = requiredQuestions.some(
        question => values[question] === true || values[question] === 'true'
    );
    
    if (hasHealthCondition && !values.health_additional_info?.trim()) {
        errors.health_additional_info = 'Please provide details about your health conditions';
    }

    console.log('Health Questions Validation Errors:', errors);
    console.log('=== Health Questions Validation End ===');
};

const validateTerms = (values, errors) => {
    console.log('=== Terms Validation Start ===');
    
    if (!values.terms_accepted) {
        errors.terms_accepted = 'You must accept the terms and conditions';
    }

    if (!values.privacy_accepted) {
        errors.privacy_accepted = 'You must accept the privacy policy';
    }

    console.log('Terms Validation Errors:', errors);
    console.log('=== Terms Validation End ===');
};

module.exports = {
    patterns,
    validateRegistration,
    validateFiles,
    validatePersonalInfo,
    validateHealthInfo,
    validateEmergencyContact,
    validateHealthQuestions,
    validateTerms
};