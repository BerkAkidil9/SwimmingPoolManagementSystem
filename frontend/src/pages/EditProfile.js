import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUser, FaPhone, FaCalendarAlt, FaVenusMars, FaEnvelope, FaIdCard, FaCamera, FaSave, FaExclamationTriangle, FaTimes, FaHeartbeat, FaQuestion, FaWeight, FaRulerVertical, FaAllergies, FaMedkit, FaNotesMedical, FaKey, FaRedo } from 'react-icons/fa';
import Navbar from '../components/Navbar/Navbar';
import './EditProfile.css';
import { 
  validateHealthInfo, 
  validateHealthQuestions, 
  validateEmergencyContact,
  checkPhoneUnique
} from '../utils/validations';

const EditProfile = () => {
  const navigate = useNavigate();
  
  // Define validation patterns here at component level
  const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^05\d{2}[- ]?\d{3}[- ]?\d{2}[- ]?\d{2}$/, // Turkish phone format
    name: /^[A-Za-zğüşıöçĞÜŞİÖÇ\s]{2,50}$/, // Turkish characters, 2-50 chars
  };
  
  const [originalPhone, setOriginalPhone] = useState('');
  const HEALTH_QUESTION_KEYS = ['has_heart_problems', 'chest_pain_activity', 'balance_dizziness', 'other_chronic_disease', 'prescribed_medication', 'bone_joint_issues', 'doctor_supervised_activity'];
  
  // Format phone number with dashes
  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/\D/g, '');
    if (phoneNumber.length >= 10) {
      return phoneNumber.replace(/(\d{4})(\d{3})(\d{2})(\d{2})/, '$1-$2-$3-$4');
    }
    return phoneNumber;
  };
  
  const [userProfile, setUserProfile] = useState({
    name: '',
    surname: '',
    email: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    profile_photo_path: '',
    id_card_path: '',
    emergencyContact: {
      name: '',
      phone: '',
      relationship: 'parent'
    },
    blood_type: 'O+',
    height: '',
    weight: '',
    allergies: '',
    chronic_conditions: '',
    medications: '',
    has_heart_problems: 'false',
    chest_pain_activity: 'false',
    balance_dizziness: 'false',
    other_chronic_disease: 'false',
    prescribed_medication: 'false',
    bone_joint_issues: 'false',
    doctor_supervised_activity: 'false',
    health_additional_info: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [activeSection, setActiveSection] = useState('personal'); // To control which section is expanded
  const [hasHealthConditions, setHasHealthConditions] = useState(false);
  const [resetPasswordSent, setResetPasswordSent] = useState(false);
  
  const profilePhotoRef = useRef(null);
  const idCardRef = useRef(null);
  
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [idCardPreview, setIdCardPreview] = useState(null);
  const [healthInfo, setHealthInfo] = useState(null);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    // Handle case where path might be a full URL already
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Clean up the path - convert Windows backslashes to forward slashes
    let cleanPath = imagePath.trim()
      .replace(/\\/g, '/') // Convert backslashes to forward slashes
      .replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
    
    // Check if path already contains 'uploads'
    if (cleanPath.startsWith('uploads/')) {
      return `${serverUrl}/${cleanPath}`;
    } 
    
    // Handle profile photos and ID cards paths
    return `${serverUrl}/uploads/${cleanPath}`;
  };

  // Helper function to check if a file is a PDF
  const isPDF = (path) => {
    return path && path.toLowerCase().endsWith('.pdf');
  };

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get profile information
      const profileResponse = await axios.get('/api/member/profile', { withCredentials: true });
      console.log('Profile response:', profileResponse.data);
      console.log('Profile photo path from server:', profileResponse.data.profile_photo_path);
      console.log('ID card path from server:', profileResponse.data.id_card_path);
      
      // Store the original phone number to skip uniqueness check on update
      setOriginalPhone(profileResponse.data.phone || '');
      
      // Get health information
      let healthInfo;
      try {
        const healthInfoResponse = await axios.get('/api/member/health-info', { withCredentials: true });
        healthInfo = healthInfoResponse.data;
        console.log('Health info response:', healthInfo);
      } catch (error) {
        console.log('No health info found, using defaults');
        healthInfo = {}; // Default empty object if no health info found
      }
      
      // Format date of birth if it exists
      const formattedDOB = profileResponse.data.date_of_birth ? 
          new Date(profileResponse.data.date_of_birth).toISOString().split('T')[0] : '';
      
      // Set the user profile state with fetched data
      setUserProfile(prevState => ({
        ...prevState,
        name: profileResponse.data.name || '',
        surname: profileResponse.data.surname || '',
        email: profileResponse.data.email || '',
        phone: profileResponse.data.phone || '',
        date_of_birth: formattedDOB,
        gender: profileResponse.data.gender || '',
        profile_photo_path: profileResponse.data.profile_photo_path || '',
        id_card_path: profileResponse.data.id_card_path || '',
        emergencyContact: {
          name: healthInfo.emergency_contact_name || '',
          phone: healthInfo.emergency_contact_phone || '',
          relationship: healthInfo.emergency_contact_relationship || 'parent'
        },
        blood_type: healthInfo.blood_type || 'O+',
        height: healthInfo.height || '',
        weight: healthInfo.weight || '',
        allergies: healthInfo.allergies || '',
        chronic_conditions: healthInfo.chronic_conditions || '',
        medications: healthInfo.medications || '',
        // Health questions - convert boolean to string 'true'/'false' for the select elements
        has_heart_problems: healthInfo.has_heart_problems === 1 ? 'true' : 'false',
        chest_pain_activity: healthInfo.chest_pain_activity === 1 ? 'true' : 'false',
        balance_dizziness: healthInfo.balance_dizziness === 1 ? 'true' : 'false',
        other_chronic_disease: healthInfo.other_chronic_disease === 1 ? 'true' : 'false',
        prescribed_medication: healthInfo.prescribed_medication === 1 ? 'true' : 'false',
        bone_joint_issues: healthInfo.bone_joint_issues === 1 ? 'true' : 'false',
        doctor_supervised_activity: healthInfo.doctor_supervised_activity === 1 ? 'true' : 'false',
        health_additional_info: healthInfo.health_additional_info || ''
      }));
      
      // Log and set profile image path
      if (profileResponse.data.profile_photo_path) {
        try {
          const imageUrl = getImageUrl(profileResponse.data.profile_photo_path);
          console.log("Setting profile photo preview to:", imageUrl);
          console.log("Original path was:", profileResponse.data.profile_photo_path);
          setProfilePhotoPreview(imageUrl);
        } catch (error) {
          console.error("Error setting profile photo path:", error);
        }
      } else {
        console.log("No profile photo path found in response");
      }
      
      // Log and set ID card path
      if (profileResponse.data.id_card_path) {
        try {
          const imageUrl = getImageUrl(profileResponse.data.id_card_path);
          console.log("Setting ID card preview to:", imageUrl);
          console.log("Original path was:", profileResponse.data.id_card_path);
          setIdCardPreview(imageUrl);
        } catch (error) {
          console.error("Error setting ID card path:", error);
        }
      } else {
        console.log("No ID card path found in response");
      }
      
    } catch (error) {
      console.error('Error fetching user data:', error);
      setErrorMessage('Failed to load user data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, []);

  const validateForm = async () => {
    let allErrors = {};
    
    // Custom validation for personal info fields
    // Note: We're not using validatePersonalInfo from validations.js since we need
    // special handling for the phone uniqueness check
    
    // Name validation
    if (!userProfile.name || !userProfile.name.trim()) {
      allErrors.name = 'Name is required';
    } else if (userProfile.name.length < 2) {
      allErrors.name = 'Name must be at least 2 characters';
    } else if (!patterns.name.test(userProfile.name)) {
      allErrors.name = 'Name can only contain letters and spaces';
    }
    
    // Surname validation
    if (!userProfile.surname || !userProfile.surname.trim()) {
      allErrors.surname = 'Surname is required';
    } else if (userProfile.surname.length < 2) {
      allErrors.surname = 'Surname must be at least 2 characters';
    } else if (!patterns.name.test(userProfile.surname)) {
      allErrors.surname = 'Surname can only contain letters and spaces';
    }
    
    // Email validation - only check format
    if (!userProfile.email || !userProfile.email.trim()) {
      allErrors.email = 'Email is required';
    } else if (!patterns.email.test(userProfile.email)) {
      allErrors.email = 'Invalid email format';
    }
    
    // Phone validation - only check format and skip uniqueness check if it's the original phone
    if (!userProfile.phone || !userProfile.phone.trim()) {
      allErrors.phone = 'Phone number is required';
    } else if (!patterns.phone.test(userProfile.phone)) {
      allErrors.phone = 'Invalid phone format (05XX-XXX-XX-XX)';
    } else if (userProfile.phone !== originalPhone) {
      try {
        const isPhoneUnique = await checkPhoneUnique(userProfile.phone);
        if (!isPhoneUnique) {
          allErrors.phone = 'This phone number is already registered with another account';
        }
      } catch (error) {
        console.error('Error checking phone uniqueness:', error);
      }
    }
    
    // Date of birth validation
    if (!userProfile.date_of_birth) {
      allErrors.date_of_birth = 'Date of birth is required';
    } else {
      const birthDate = new Date(userProfile.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      
      // Account for not having had birthday yet this year
      if (today.getMonth() < birthDate.getMonth() || 
          (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      if (age < 18) {
        allErrors.date_of_birth = 'You must be at least 18 years old';
      } else if (age > 100) {
        allErrors.date_of_birth = 'Please enter a valid date of birth';
      }
    }
    
    // Gender validation
    if (!userProfile.gender) {
      allErrors.gender = 'Gender is required';
    }
    
    // Health info validation
    const healthData = {
      height: userProfile.height,
      weight: userProfile.weight,
      blood_type: userProfile.blood_type,
      allergies: userProfile.allergies,
      chronic_conditions: userProfile.chronic_conditions,
      medications: userProfile.medications
    };
    const healthErrors = validateHealthInfo(healthData);
    
    // Health questions validation
    const healthQuestionsData = {
      has_heart_problems: userProfile.has_heart_problems === 'true',
      chest_pain_activity: userProfile.chest_pain_activity === 'true',
      balance_dizziness: userProfile.balance_dizziness === 'true',
      other_chronic_disease: userProfile.other_chronic_disease === 'true',
      prescribed_medication: userProfile.prescribed_medication === 'true',
      bone_joint_issues: userProfile.bone_joint_issues === 'true',
      doctor_supervised_activity: userProfile.doctor_supervised_activity === 'true',
      health_additional_info: userProfile.health_additional_info
    };
    const healthQuestionsErrors = validateHealthQuestions(healthQuestionsData);
    
    // Emergency contact validation
    const emergencyContactData = {
      emergency_contact_name: userProfile.emergencyContact.name,
      emergency_contact_phone: userProfile.emergencyContact.phone,
      emergency_contact_relationship: userProfile.emergencyContact.relationship,
      phone: userProfile.phone // To check if emergency phone is same as user's phone
    };
    const emergencyContactErrors = validateEmergencyContact(emergencyContactData);
    
    // Map emergency contact errors back to our form structure
    const mappedEmergencyContactErrors = {};
    Object.entries(emergencyContactErrors).forEach(([key, value]) => {
      if (key.startsWith('emergency_contact_')) {
        const formKey = key.replace('emergency_contact_', '');
        mappedEmergencyContactErrors[`emergencyContact.${formKey}`] = value;
      }
    });
    
    // Combine all errors
    const finalErrors = {
      ...allErrors,
      ...healthErrors,
      ...healthQuestionsErrors,
      ...mappedEmergencyContactErrors
    };
    
    setFormErrors(finalErrors);
    return Object.keys(finalErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'phone') {
      const formattedNumber = formatPhoneNumber(value);
      setUserProfile({
        ...userProfile,
        [name]: formattedNumber
      });
    } else if (name === 'emergencyContact.phone') {
      const formattedNumber = formatPhoneNumber(value);
      setUserProfile({
        ...userProfile,
        emergencyContact: {
          ...userProfile.emergencyContact,
          phone: formattedNumber
        }
      });
    } else if (name.includes('.')) {
      // Handle nested object (emergency contact)
      const [parent, child] = name.split('.');
      setUserProfile({
        ...userProfile,
        [parent]: {
          ...userProfile[parent],
          [child]: value
        }
      });
    } else {
      setUserProfile({
        ...userProfile,
        [name]: value
      });
    }
    
    // Clear error when field is edited
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
    
    // Perform client-side validation instantly for certain fields
    if (['name', 'surname', 'email', 'phone', 'date_of_birth', 'gender', 'height', 'weight'].includes(name)) {
      const field = {};
      field[name] = value;
      
      // Validate only the current field
      let fieldError = null;
      
      if (name === 'name' || name === 'surname') {
        if (!value) {
          fieldError = `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
        } else if (value.length < 2) {
          fieldError = `${name.charAt(0).toUpperCase() + name.slice(1)} must be at least 2 characters`;
        } else if (!patterns.name.test(value)) {
          fieldError = `${name.charAt(0).toUpperCase() + name.slice(1)} can only contain letters and spaces`;
        }
      } else if (name === 'email') {
        if (!value) {
          fieldError = "Email is required";
        } else if (!patterns.email.test(value)) {
          fieldError = "Invalid email format";
        }
      } else if (name === 'phone') {
        if (!value) {
          fieldError = "Phone number is required";
        } else if (!patterns.phone.test(value)) {
          fieldError = "Invalid phone format (05XX-XXX-XX-XX)";
        }
        // Removed real-time uniqueness check to avoid unnecessary API calls
        // Will check only on submission
      } else if (name === 'date_of_birth') {
        if (!value) {
          fieldError = "Date of birth is required";
        } else {
          const birthDate = new Date(value);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          
          // Account for not having had birthday yet this year
          if (today.getMonth() < birthDate.getMonth() || 
              (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
            age--;
          }
          
          if (age < 18) {
            fieldError = "You must be at least 18 years old";
          } else if (age > 100) {
            fieldError = "Please enter a valid date of birth";
          }
        }
      } else if (name === 'gender') {
        if (!value) {
          fieldError = "Gender is required";
        }
      } else if (name === 'height') {
        if (!value) {
          fieldError = "Height is required";
        } else {
          const heightValue = parseFloat(value);
          if (isNaN(heightValue)) {
            fieldError = "Height must be a number";
          } else if (heightValue < 100) {
            fieldError = "Height must be at least 100 cm";
          } else if (heightValue > 250) {
            fieldError = "Height must be less than 250 cm";
          }
        }
      } else if (name === 'weight') {
        if (!value) {
          fieldError = "Weight is required";
        } else {
          const weightValue = parseFloat(value);
          if (isNaN(weightValue)) {
            fieldError = "Weight must be a number";
          } else if (weightValue < 30) {
            fieldError = "Weight must be at least 30 kg";
          } else if (weightValue > 300) {
            fieldError = "Weight must be less than 300 kg";
          }
        }
      }
      
      if (fieldError) {
        setFormErrors(prev => ({
          ...prev,
          [name]: fieldError
        }));
      }
    }
    
    // Emergency contact fields validation
    if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      
      // Validate emergency contact fields
      let fieldError = null;
      
      if (field === 'name') {
        if (!value) {
          fieldError = "Emergency contact name is required";
        } else if (value.length < 2) {
          fieldError = "Name must be at least 2 characters";
        } else if (!patterns.name.test(value)) {
          fieldError = "Name can only contain letters and spaces";
        }
      } else if (field === 'phone') {
        if (!value) {
          fieldError = "Emergency contact phone is required";
        } else if (!patterns.phone.test(value)) {
          fieldError = "Invalid phone format (05XX-XXX-XX-XX)";
        } else if (value === userProfile.phone) {
          fieldError = "Emergency contact phone cannot be same as your phone";
        }
      } else if (field === 'relationship') {
        if (!value) {
          fieldError = "Please specify the relationship";
        }
      }
      
      if (fieldError) {
        setFormErrors(prev => ({
          ...prev,
          [name]: fieldError
        }));
      }
    }
    
    // Health information validation
    if (['height', 'weight', 'blood_type'].includes(name)) {
      let fieldError = null;
      
      if (name === 'height') {
        if (value) {
          const height = Number(value);
          if (isNaN(height) || height < 100 || height > 250) {
            fieldError = "Please enter a valid height (100-250 cm)";
          }
        }
      } else if (name === 'weight') {
        if (value) {
          const weight = Number(value);
          if (isNaN(weight) || weight < 30 || weight > 300) {
            fieldError = "Please enter a valid weight (30-300 kg)";
          }
        }
      } else if (name === 'blood_type') {
        if (value && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(value)) {
          fieldError = "Please select a valid blood type";
        }
      }
      
      if (fieldError) {
        setFormErrors(prev => ({
          ...prev,
          [name]: fieldError
        }));
      }
    }
    
    // Text area length validation
    if (['allergies', 'chronic_conditions', 'medications', 'health_additional_info'].includes(name) && value?.length > 500) {
      setFormErrors(prev => ({
        ...prev,
        [name]: `This field is too long (max 500 characters)`
      }));
    }
    
    // Clear any success/error messages
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      // Clear any error messages when a new file is selected
      setErrorMessage('');
    }
  };

  const handleIdCardChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setIdCardPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      // Clear any error messages when a new file is selected
      setErrorMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!await validateForm()) {
      window.scrollTo(0, 0);
      return;
    }
    
    try {
      setUpdating(true);
      setErrorMessage('');
      
      // Format date of birth to YYYY-MM-DD for the database
      const formattedDOB = userProfile.date_of_birth ? 
          userProfile.date_of_birth.split('T')[0] : userProfile.date_of_birth;
      
      // Update profile information
      await axios.post('/api/member/update-profile', {
        name: userProfile.name,
        surname: userProfile.surname,
        email: userProfile.email,
        phone: userProfile.phone,
        date_of_birth: formattedDOB,
        gender: userProfile.gender
      }, { withCredentials: true });
      
      // Update health information and emergency contact in a single call
      await axios.post('/api/member/update-health-info', {
        // Emergency contact information
        emergency_contact_name: userProfile.emergencyContact.name,
        emergency_contact_phone: userProfile.emergencyContact.phone,
        emergency_contact_relationship: userProfile.emergencyContact.relationship,
        // Health information
        blood_type: userProfile.blood_type,
        height: userProfile.height,
        weight: userProfile.weight,
        allergies: userProfile.allergies,
        chronic_conditions: userProfile.chronic_conditions,
        medications: userProfile.medications,
        // Health questions - convert string 'true'/'false' to 0/1 for database
        has_heart_problems: userProfile.has_heart_problems === 'true' ? 1 : 0,
        chest_pain_activity: userProfile.chest_pain_activity === 'true' ? 1 : 0,
        balance_dizziness: userProfile.balance_dizziness === 'true' ? 1 : 0,
        other_chronic_disease: userProfile.other_chronic_disease === 'true' ? 1 : 0,
        prescribed_medication: userProfile.prescribed_medication === 'true' ? 1 : 0,
        bone_joint_issues: userProfile.bone_joint_issues === 'true' ? 1 : 0,
        doctor_supervised_activity: userProfile.doctor_supervised_activity === 'true' ? 1 : 0,
        health_additional_info: userProfile.health_additional_info
      }, { withCredentials: true });
      
      // Handle profile photo upload
      if (profilePhotoRef.current && profilePhotoRef.current.files[0]) {
        try {
          const formData = new FormData();
          formData.append('profilePhoto', profilePhotoRef.current.files[0]);
          
          const response = await axios.post('/api/member/upload-profile-photo', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            withCredentials: true
          });
          console.log("Profile photo upload successful:", response.data);
        } catch (error) {
          console.error("Error uploading profile photo:", error);
          setErrorMessage("Profile updated but there was an error uploading the profile photo.");
        }
      }
      
      // Handle ID card upload
      if (idCardRef.current && idCardRef.current.files[0]) {
        try {
          const formData = new FormData();
          formData.append('idCard', idCardRef.current.files[0]);
          
          const response = await axios.post('/api/member/upload-id-card', formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            },
            withCredentials: true
          });
          console.log("ID card upload successful:", response.data);
        } catch (error) {
          console.error("Error uploading ID card:", error);
          setErrorMessage(prev => prev || "Profile updated but there was an error uploading the ID card.");
        }
      }
      
      // Update user in session storage
      const userStr = sessionStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        const updatedUser = {
          ...userData,
          name: userProfile.name,
          surname: userProfile.surname,
          email: userProfile.email,
          phone: userProfile.phone
        };
        sessionStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      setSuccessMessage('Profile updated successfully!');
      if (!errorMessage) {
        setErrorMessage('');
      }
      
      // Refresh the user data
      await fetchUserData();
      
      // Scroll to top to show success message
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Error updating profile:', error);
      const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to update profile. Please try again.';
      setErrorMessage(msg);
      setSuccessMessage('');
      
      // Scroll to top to show error message
      window.scrollTo(0, 0);
    } finally {
      setUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setUpdating(true);
      setErrorMessage('');
      
      // Call the reset password API
      await axios.post('/auth/reset-password-request', {
        email: userProfile.email
      }, { withCredentials: true });
      
      setResetPasswordSent(true);
      setSuccessMessage('Password reset link has been sent to your email.');
      
      // Scroll to top to show success message
      window.scrollTo(0, 0);
    } catch (error) {
      console.error('Error requesting password reset:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to send password reset. Please try again.');
      setSuccessMessage('');
      
      // Scroll to top to show error message
      window.scrollTo(0, 0);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div className="edit-profile-container loading">
          <div className="loading-spinner"></div>
          <p>Loading profile information...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <div className="edit-profile-container">
        <div className="page-header">
          <h1>Edit Profile</h1>
          <button className="close-button" onClick={() => navigate('/dashboard')}>
            <FaTimes />
          </button>
        </div>
        
        {successMessage && (
          <div className="alert success">
            <FaSave /> {successMessage}
          </div>
        )}
        
        {errorMessage && (
          <div className="alert error">
            <FaExclamationTriangle /> {errorMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-section">
            <h2>Personal Information</h2>
            
            <div className="form-group">
              <label>
                <FaUser /> First Name
              </label>
              <input
                type="text"
                name="name"
                value={userProfile.name}
                onChange={handleInputChange}
                className={formErrors.name ? 'input-error' : ''}
              />
              {formErrors.name && <span className="error">{formErrors.name}</span>}
            </div>
            
            <div className="form-group">
              <label>
                <FaUser /> Last Name
              </label>
              <input
                type="text"
                name="surname"
                value={userProfile.surname}
                onChange={handleInputChange}
                className={formErrors.surname ? 'input-error' : ''}
              />
              {formErrors.surname && <span className="error">{formErrors.surname}</span>}
            </div>
            
            <div className="form-group">
              <label>
                <FaEnvelope /> Email
              </label>
              <input
                type="email"
                name="email"
                value={userProfile.email}
                onChange={handleInputChange}
                className={formErrors.email ? 'input-error' : ''}
              />
              {formErrors.email && <span className="error">{formErrors.email}</span>}
            </div>
            
            <div className="form-group">
              <label>
                <FaKey /> Password
              </label>
              <div className="password-reset-container">
                <input
                  type="password"
                  value="••••••••••••"
                  disabled
                  className="password-field"
                  onCopy={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  onCut={(e) => e.preventDefault()}
                />
                <button 
                  type="button" 
                  className="reset-password-button"
                  onClick={handleResetPassword}
                  disabled={updating || resetPasswordSent}
                >
                  <FaRedo /> {resetPasswordSent ? 'Link Sent' : 'Reset Password'}
                </button>
              </div>
              {resetPasswordSent && <span className="success-text">Password reset link sent to your email.</span>}
            </div>
            
            <div className="form-group">
              <label>
                <FaPhone /> Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formatPhoneNumber(userProfile.phone)}
                onChange={handleInputChange}
                className={formErrors.phone ? 'input-error' : ''}
                placeholder="555-123-4567"
              />
              {formErrors.phone && <span className="error">{formErrors.phone}</span>}
            </div>
            
            <div className="form-group">
              <label>
                <FaCalendarAlt /> Date of Birth
              </label>
              <input
                type="date"
                name="date_of_birth"
                value={userProfile.date_of_birth}
                onChange={handleInputChange}
                className={formErrors.date_of_birth ? 'input-error' : ''}
              />
              {formErrors.date_of_birth && <span className="error">{formErrors.date_of_birth}</span>}
            </div>
            
            <div className="form-group">
              <label>
                <FaVenusMars /> Gender
              </label>
              <select
                name="gender"
                value={userProfile.gender}
                onChange={handleInputChange}
                className={formErrors.gender ? 'input-error' : ''}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {formErrors.gender && <span className="error">{formErrors.gender}</span>}
            </div>
            
            <div className="form-group">
              <label>
                <FaCamera /> Profile Photo
              </label>
              <div className="photo-container">
                {profilePhotoPreview && (
                  <div className="image-preview">
                    <img 
                      src={profilePhotoPreview} 
                      alt="Profile Preview" 
                      onError={(e) => {
                        console.error("Error loading profile image:", e);
                        console.error("Image path that failed:", profilePhotoPreview);
                        // Use a data URI for the fallback image to ensure it always works
                        e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjY2NjYyI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MyLjY3IDAgNC41NSAyLjIzIDQuNSA1TDE2LjUgMTFoLTl2LS41QzcuNSA3LjIzIDkuMzggNSAxMiA1ek0xMiAxOWMtMy4zMSAwLTYuMTctMS45NC03LjUtNC43NUEzLjAwNSAzLjAwNSAwIDAxNyAxNGg5YzEuMTUgMCAyLjA5LjgyIDIuMzMgMS45MUMxNy4xNyAxNy4wNiAxNC4zMSAxOSAxMiAxOXoiLz48L3N2Zz4=";
                        e.target.onerror = null;
                      }}
                      style={{maxHeight: '200px', objectFit: 'contain'}}
                    />
                  </div>
                )}
                <input
                  type="file"
                  id="profilePhoto"
                  ref={profilePhotoRef}
                  onChange={handleProfilePhotoChange}
                  accept="image/*"
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>
                <FaIdCard /> ID Card
              </label>
              <div className="photo-container">
                {idCardPreview && (
                  <div className="image-preview">
                    {isPDF(idCardPreview) ? (
                      <div className="pdf-preview">
                        <div className="pdf-info">
                          <FaIdCard size="40" className="pdf-icon" />
                          <div className="pdf-details">
                            <span className="pdf-filename">{idCardPreview.split('/').pop()}</span>
                            <a href={idCardPreview} target="_blank" rel="noopener noreferrer" className="view-pdf-button">
                              View PDF
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img 
                        src={idCardPreview} 
                        alt="ID Card Preview" 
                        onError={(e) => {
                          console.error("Error loading ID card image:", e);
                          console.error("Image path that failed:", idCardPreview);
                          // Use a data URI for the fallback image to ensure it always works
                          e.target.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2NjY2NjYyI+PHBhdGggZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgM2MyLjY3IDAgNC41NSAyLjIzIDQuNSA1TDE2LjUgMTFoLTl2LS41QzcuNSA3LjIzIDkuMzggNSAxMiA1ek0xMiAxOWMtMy4zMSAwLTYuMTctMS45NC03LjUtNC43NUEzLjAwNSAzLjAwNSAwIDAxNyAxNGg5YzEuMTUgMCAyLjA5LjgyIDIuMzMgMS45MUMxNy4xNyAxNy4wNiAxNC4zMSAxOSAxMiAxOXoiLz48L3N2Zz4=";
                          e.target.onerror = null;
                        }}
                        style={{maxHeight: '200px', objectFit: 'contain'}}
                      />
                    )}
                  </div>
                )}
                <input
                  type="file"
                  id="idCard"
                  ref={idCardRef}
                  onChange={handleIdCardChange}
                  accept=".jpg,.jpeg,.png,.pdf"
                />
              </div>
            </div>
          </div>
          
          <div className="form-section">
            <h2>Emergency Contact</h2>
            
            <div className="form-group">
              <label>
                Name
              </label>
              <input
                type="text"
                name="emergencyContact.name"
                value={userProfile.emergencyContact.name}
                onChange={handleInputChange}
                placeholder="Emergency Contact Name"
              />
              {formErrors['emergencyContact.name'] && <span className="error">{formErrors['emergencyContact.name']}</span>}
            </div>
            
            <div className="form-group">
              <label>
                Phone
              </label>
              <input
                type="tel"
                name="emergencyContact.phone"
                value={formatPhoneNumber(userProfile.emergencyContact.phone)}
                onChange={handleInputChange}
                placeholder="Emergency Contact Phone"
              />
              {formErrors['emergencyContact.phone'] && <span className="error">{formErrors['emergencyContact.phone']}</span>}
            </div>
            
            <div className="form-group">
              <label>
                Relationship to Emergency Contact
              </label>
              <select
                name="emergencyContact.relationship"
                value={userProfile.emergencyContact.relationship || 'parent'}
                onChange={handleInputChange}
              >
                <option value="">Select Relationship</option>
                <option value="parent">Parent</option>
                <option value="spouse">Spouse</option>
                <option value="sibling">Sibling</option>
                <option value="relative">Other Relative</option>
                <option value="friend">Friend</option>
                <option value="other">Other</option>
              </select>
              {formErrors['emergencyContact.relationship'] && <span className="error">{formErrors['emergencyContact.relationship']}</span>}
            </div>
          </div>
          
          <div className="form-section">
            <h2>Health Information</h2>
            
            <div className="form-group">
              <label>
                <FaHeartbeat /> Blood Type
              </label>
              <select
                name="blood_type"
                value={userProfile.blood_type || ''}
                onChange={handleInputChange}
              >
                <option value="">Select Blood Type</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>
                <FaRulerVertical /> Height (cm)
              </label>
              <input
                type="number"
                name="height"
                value={userProfile.height || ''}
                onChange={handleInputChange}
                placeholder="Height in cm"
                className={formErrors.height ? 'input-error' : ''}
              />
              {formErrors.height && <span className="error">{formErrors.height}</span>}
            </div>
            
            <div className="form-group">
              <label>
                <FaWeight /> Weight (kg)
              </label>
              <input
                type="number"
                name="weight"
                value={userProfile.weight || ''}
                onChange={handleInputChange}
                placeholder="Weight in kg"
                className={formErrors.weight ? 'input-error' : ''}
              />
              {formErrors.weight && <span className="error">{formErrors.weight}</span>}
            </div>
            
            <div className="form-group">
              <label>
                <FaAllergies /> Allergies
              </label>
              <textarea
                name="allergies"
                value={userProfile.allergies || ''}
                onChange={handleInputChange}
                placeholder="List any allergies"
              />
            </div>
            
            <div className="form-group">
              <label>
                <FaMedkit /> Chronic Conditions
              </label>
              <textarea
                name="chronic_conditions"
                value={userProfile.chronic_conditions || ''}
                onChange={handleInputChange}
                placeholder="List any chronic conditions"
              />
            </div>
            
            <div className="form-group">
              <label>
                <FaNotesMedical /> Medications
              </label>
              <textarea
                name="medications"
                value={userProfile.medications || ''}
                onChange={handleInputChange}
                placeholder="List any medications"
              />
            </div>
          </div>
          
          <div className="form-section">
            <h2>Health Questions</h2>
            
            <div className="form-group">
              <label>
                <FaQuestion /> Do you have any heart problems?
              </label>
              <select
                name="has_heart_problems"
                value={userProfile.has_heart_problems || 'false'}
                onChange={handleInputChange}
              >
                <option value="">Select an option</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>
                <FaQuestion /> Do you experience chest pain during activity?
              </label>
              <select
                name="chest_pain_activity"
                value={userProfile.chest_pain_activity || 'false'}
                onChange={handleInputChange}
              >
                <option value="">Select an option</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>
                <FaQuestion /> Do you experience balance or dizziness?
              </label>
              <select
                name="balance_dizziness"
                value={userProfile.balance_dizziness || 'false'}
                onChange={handleInputChange}
              >
                <option value="">Select an option</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>
                <FaQuestion /> Do you have any other chronic diseases?
              </label>
              <select
                name="other_chronic_disease"
                value={userProfile.other_chronic_disease || 'false'}
                onChange={handleInputChange}
              >
                <option value="">Select an option</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>
                <FaQuestion /> Are you prescribed any medication?
              </label>
              <select
                name="prescribed_medication"
                value={userProfile.prescribed_medication || 'false'}
                onChange={handleInputChange}
              >
                <option value="">Select an option</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>
                <FaQuestion /> Do you have any bone or joint issues?
              </label>
              <select
                name="bone_joint_issues"
                value={userProfile.bone_joint_issues || 'false'}
                onChange={handleInputChange}
              >
                <option value="">Select an option</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>
                <FaQuestion /> Do you require doctor-supervised activity?
              </label>
              <select
                name="doctor_supervised_activity"
                value={userProfile.doctor_supervised_activity || 'false'}
                onChange={handleInputChange}
              >
                <option value="">Select an option</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>
                <FaNotesMedical /> Additional Health Information
                {HEALTH_QUESTION_KEYS.some(q => userProfile[q] === 'true') && (
                  <span className="required-hint"> (required when you answer Yes above)</span>
                )}
              </label>
              {HEALTH_QUESTION_KEYS.some(q => userProfile[q] === 'true') && (
                <p className="field-hint">
                  <FaExclamationTriangle /> If you answered "Yes" to any health question above, please provide details about your condition(s) in the field below.
                </p>
              )}
              <textarea
                name="health_additional_info"
                value={userProfile.health_additional_info || ''}
                onChange={handleInputChange}
                placeholder={HEALTH_QUESTION_KEYS.some(q => userProfile[q] === 'true') ? "Please describe your health condition(s)..." : "Any additional health information"}
                className={formErrors.health_additional_info ? 'input-error' : ''}
              />
              {formErrors.health_additional_info && <span className="error">{formErrors.health_additional_info}</span>}
            </div>
          </div>
          
          <div className="form-buttons">
            <button 
              type="submit"
              className="submit-button"
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfile;
