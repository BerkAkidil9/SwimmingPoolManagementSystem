import { validatePersonalInfo, validateHealthInfo } from '../../utils/validations';

jest.mock('../../utils/validations', () => {
  const actual = jest.requireActual('../../utils/validations');
  return {
    ...actual,
    checkEmailUnique: jest.fn(() => Promise.resolve(true)),
    checkPhoneUnique: jest.fn(() => Promise.resolve(true)),
  };
});

describe('Frontend validations', () => {
  describe('validatePersonalInfo', () => {
    it('returns errors for empty name', async () => {
      const errors = await validatePersonalInfo({});
      expect(errors.name).toBe('Name is required');
    });

    it('returns errors for invalid email', async () => {
      const errors = await validatePersonalInfo({ name: 'Ali', surname: 'Veli', email: 'bad' });
      expect(errors.email).toBeDefined();
    });
  });

  describe('validateHealthInfo', () => {
    it('returns error for missing height', () => {
      const errors = validateHealthInfo({});
      expect(errors.height).toBe('Height is required');
    });

    it('returns error for invalid height', () => {
      const errors = validateHealthInfo({ height: 50, weight: 70 });
      expect(errors.height).toContain('valid');
    });
  });
});
