// Update patterns to be more strict
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^05\d{2}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2}$/, // Turkish phone format
  name: /^[A-Za-zğüşıöçĞÜŞİÖÇ\s]{2,50}$/, // Turkish characters, 2-50 chars
};

// Add server validation check functions and export them
export const checkEmailUnique = async (email) => {
  try {
    const response = await fetch('http://localhost:3001/auth/check-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await response.json();
    return data.isUnique;
  } catch (error) {
    console.error('Email check failed:', error);
    return true; // Assume unique on error to not block user
  }
};

export const checkPhoneUnique = async (phone) => {
  try {
    const response = await fetch('http://localhost:3001/auth/check-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });
    const data = await response.json();
    return data.isUnique;
  } catch (error) {
    console.error('Phone check failed:', error);
    return true; // Assume unique on error to not block user
  }
};

export const validatePersonalInfo = async (values, isSocialRegistration = false) => {
  const errors = {};

  // Always validate name
  if (!values.name) {
    errors.name = "Name is required";
  } else if (values.name.length < 2) {
    errors.name = "Name must be at least 2 characters";
  } else if (!/^[A-Za-zğüşıöçĞÜŞİÖÇ\s]{2,50}$/.test(values.name)) {
    errors.name = "Name can only contain letters and spaces";
  }

  // Always validate email format, but skip uniqueness check for social registration
  if (!values.email) {
    errors.email = "Email is required";
  } else if (!patterns.email.test(values.email)) {
    errors.email = "Invalid email format";
  } else if (!isSocialRegistration) {
    // Only check email uniqueness for non-social registration
    const isUnique = await checkEmailUnique(values.email);
    if (!isUnique) {
      errors.email = "This email is already registered";
    }
  }

  // Always validate phone
  if (!values.phone) {
    errors.phone = "Phone number is required";
  } else if (!patterns.phone.test(values.phone)) {
    errors.phone = "Invalid phone format (05XX-XXX-XX-XX)";
  } else {
    // Always check phone uniqueness
    const isUnique = await checkPhoneUnique(values.phone);
    if (!isUnique) {
      errors.phone = "This phone number is already registered";
    }
  }

  // Always validate surname
  if (!values.surname) {
    errors.surname = "Surname is required";
  } else if (values.surname.length < 2) {
    errors.surname = "Surname must be at least 2 characters";
  } else if (!patterns.name.test(values.surname)) {
    errors.surname = "Surname can only contain letters and spaces";
  }

  // Always validate date of birth
  if (!values.date_of_birth) {
    errors.date_of_birth = "Date of birth is required";
  } else {
    const birthDate = new Date(values.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      errors.date_of_birth = "You must be at least 18 years old";
    } else if (age > 100) {
      errors.date_of_birth = "Please enter a valid date of birth";
    }
  }

  // Always validate gender
  if (!values.gender) {
    errors.gender = "Gender is required";
  }

  // Always validate files
  if (!values.profilePhoto) {
    errors.profilePhoto = "Profile photo is required";
  }

  if (!values.idCard) {
    errors.idCard = "ID Card is required";
  }

  // Only validate password for non-social registration
  if (!isSocialRegistration) {
    if (!values.password) {
      errors.password = "Password is required";
    } else {
      if (values.password.length < 8) {
        errors.password = "Password must be at least 8 characters";
      } else if (!/[A-Z]/.test(values.password)) {
        errors.password = "Password must contain at least one uppercase letter";
      } else if (!/[a-z]/.test(values.password)) {
        errors.password = "Password must contain at least one lowercase letter";
      } else if (!/[0-9]/.test(values.password)) {
        errors.password = "Password must contain at least one number";
      }
    }

    if (!values.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (values.confirmPassword !== values.password) {
      errors.confirmPassword = "Passwords do not match";
    }
  }

  return errors;
};

export const validateHealthInfo = (values) => {
  const errors = {};

  // Height validation (100-250 cm)
  if (!values.height) {
    errors.height = "Height is required";
  } else {
    const height = Number(values.height);
    if (isNaN(height) || height < 100 || height > 250) {
      errors.height = "Please enter a valid height (100-250 cm)";
    }
  }

  // Weight validation (30-300 kg)
  if (!values.weight) {
    errors.weight = "Weight is required";
  } else {
    const weight = Number(values.weight);
    if (isNaN(weight) || weight < 30 || weight > 300) {
      errors.weight = "Please enter a valid weight (30-300 kg)";
    }
  }

  // Blood type validation
  if (!values.blood_type) {
    errors.blood_type = "Blood type is required";
  } else if (!['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(values.blood_type)) {
    errors.blood_type = "Please select a valid blood type";
  }

  // Optional fields length validation
  if (values.allergies?.length > 500) {
    errors.allergies = "Allergies description is too long (max 500 characters)";
  }

  if (values.chronic_conditions?.length > 500) {
    errors.chronic_conditions = "Chronic conditions description is too long (max 500 characters)";
  }

  if (values.medications?.length > 500) {
    errors.medications = "Medications list is too long (max 500 characters)";
  }

  return errors;
};

export const validateHealthQuestions = (values) => {
  const errors = {};

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
      errors[question] = "Please answer this question";
    }
  });

  // If any health condition is true, require additional info
  const hasHealthCondition = requiredQuestions.some(question => values[question] === true);
  if (hasHealthCondition && !values.health_additional_info?.trim()) {
    errors.health_additional_info = "Please provide details about your health conditions";
  }

  return errors;
};

export const validateEmergencyContact = (values) => {
  const errors = {};

  // Validate name instantly
  if (!values.emergency_contact_name) {
    errors.emergency_contact_name = "Emergency contact name is required";
  } else if (values.emergency_contact_name.length < 2) {
    errors.emergency_contact_name = "Name must be at least 2 characters";
  } else if (!patterns.name.test(values.emergency_contact_name)) {
    errors.emergency_contact_name = "Name can only contain letters and spaces";
  }

  // Phone validation only on form submission
  if (!values.emergency_contact_phone) {
    errors.emergency_contact_phone = "Emergency contact phone is required";
  } else if (!patterns.phone.test(values.emergency_contact_phone)) {
    errors.emergency_contact_phone = "Invalid phone format (05XX-XXX-XX-XX)";
  } else if (values.emergency_contact_phone === values.phone) {
    errors.emergency_contact_phone = "Emergency contact phone cannot be same as your phone";
  }

  // Relationship validation
  if (!values.emergency_contact_relationship) {
    errors.emergency_contact_relationship = "Please specify the relationship";
  }

  return errors;
};

export const validateTerms = (values) => {
  const errors = {};

  // Required terms acceptance
  if (!values.terms_accepted) {
    errors.terms_accepted = "You must accept the terms and conditions";
  }

  if (!values.privacy_accepted) {
    errors.privacy_accepted = "You must accept the privacy policy";
  }

  // Marketing acceptance is optional, no validation needed

  return errors;
};

export const validateStep = (step, values) => {
  switch (step) {
    case 1:
      return validatePersonalInfo(values, values.isSocialRegistration);
    case 2:
      return validateHealthInfo(values);
    case 3:
      return validateHealthQuestions(values);
    case 4:
      return validateEmergencyContact(values);
    case 5:
      return validateTerms(values);
    default:
      return {};
  }
};
