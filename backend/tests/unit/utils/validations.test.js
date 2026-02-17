const {
  validateRegistration,
  validatePersonalInfo,
  validateHealthInfo,
  validateEmergencyContact,
  validateHealthQuestions,
  validateTerms,
} = require('../../../validations');

describe('Backend validations', () => {
  describe('validatePersonalInfo', () => {
    it('should return error when name is empty', () => {
      const errors = {};
      validatePersonalInfo({ name: '' }, errors);
      expect(errors.name).toBeDefined();
    });

    it('should return error when name is too short', () => {
      const errors = {};
      validatePersonalInfo({ name: 'A' }, errors);
      expect(errors.name).toContain('at least 2');
    });

    it('should return error for invalid email', () => {
      const errors = {};
      validatePersonalInfo({ name: 'Ali', surname: 'Veli', email: 'invalid' }, errors);
      expect(errors.email).toContain('Invalid email');
    });

    it('should return error for invalid Turkish phone', () => {
      const errors = {};
      validatePersonalInfo({
        name: 'Ali',
        surname: 'Veli',
        email: 'test@test.com',
        phone: '123',
      }, errors);
      expect(errors.phone).toBeDefined();
    });

    it('should accept valid Turkish phone 05321234567', () => {
      const errors = {};
      validatePersonalInfo({
        name: 'Ali',
        surname: 'Veli',
        email: 'test@test.com',
        phone: '05321234567',
        date_of_birth: '1990-01-01',
        gender: 'male',
        swimming_ability: 'yes',
        password: 'Password123!',
        confirmPassword: 'Password123!',
        isSocialRegistration: false,
      }, errors);
      expect(errors.phone).toBeUndefined();
    });
  });

  describe('validateHealthInfo', () => {
    it('should return error when height is missing', () => {
      const errors = {};
      validateHealthInfo({}, errors);
      expect(errors.height).toBeDefined();
    });

    it('should return error when height is out of range', () => {
      const errors = {};
      validateHealthInfo({ height: 50, weight: 70 }, errors);
      expect(errors.height).toContain('valid');
    });

    it('should return error when weight is out of range', () => {
      const errors = {};
      validateHealthInfo({ height: 170, weight: 10 }, errors);
      expect(errors.weight).toBeDefined();
    });

    it('should accept valid height and weight', () => {
      const errors = {};
      validateHealthInfo({ height: 175, weight: 70, blood_type: 'A+' }, errors);
      expect(errors.height).toBeUndefined();
      expect(errors.weight).toBeUndefined();
    });
  });

  describe('validateEmergencyContact', () => {
    it('should return error when emergency contact name is empty', () => {
      const errors = {};
      validateEmergencyContact({}, errors);
      expect(errors.emergency_contact_name).toBeDefined();
    });

    it('should return error when phone same as user phone', () => {
      const errors = {};
      validateEmergencyContact({
        emergency_contact_name: 'Ahmet',
        emergency_contact_phone: '05321234567',
        phone: '05321234567',
        emergency_contact_relationship: 'Father',
      }, errors);
      expect(errors.emergency_contact_phone).toContain('same');
    });
  });

  describe('validateHealthQuestions', () => {
    it('should return error when questions are not answered', () => {
      const errors = {};
      validateHealthQuestions({
        has_heart_problems: null,
        chest_pain_activity: null,
      }, errors);
      expect(errors.has_heart_problems).toBeDefined();
    });

    it('should require health_additional_info when condition is true', () => {
      const errors = {};
      validateHealthQuestions({
        has_heart_problems: true,
        chest_pain_activity: false,
        balance_dizziness: false,
        other_chronic_disease: false,
        prescribed_medication: false,
        bone_joint_issues: false,
        doctor_supervised_activity: false,
        health_additional_info: '',
      }, errors);
      expect(errors.health_additional_info).toBeDefined();
    });
  });

  describe('validateTerms', () => {
    it('should return error when terms not accepted', () => {
      const errors = {};
      validateTerms({ terms_accepted: false, privacy_accepted: true }, errors);
      expect(errors.terms_accepted).toBeDefined();
    });

    it('should return error when privacy not accepted', () => {
      const errors = {};
      validateTerms({ terms_accepted: true, privacy_accepted: false }, errors);
      expect(errors.privacy_accepted).toBeDefined();
    });
  });

  describe('validateRegistration', () => {
    it('should return isValid false when personal info invalid', () => {
      const result = validateRegistration(
        { name: '', email: 'bad', phone: '123' },
        null,
        null
      );
      expect(result.isValid).toBe(false);
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    });

    it('should require files when not social registration', () => {
      const result = validateRegistration(
        {
          name: 'Ali',
          surname: 'Veli',
          email: 'test@test.com',
          phone: '05321234567',
          date_of_birth: '1990-01-01',
          gender: 'male',
          swimming_ability: 'yes',
          height: 175,
          weight: 70,
          blood_type: 'A+',
          emergency_contact_name: 'Ahmet',
          emergency_contact_phone: '05331112233',
          emergency_contact_relationship: 'Father',
          phone: '05321234567',
          has_heart_problems: false,
          chest_pain_activity: false,
          balance_dizziness: false,
          other_chronic_disease: false,
          prescribed_medication: false,
          bone_joint_issues: false,
          doctor_supervised_activity: false,
          terms_accepted: true,
          privacy_accepted: true,
        },
        null,
        null
      );
      expect(result.isValid).toBe(false);
      expect(result.errors.idCard || result.errors.profilePhoto).toBeDefined();
    });
  });
});
