import {
  formatWithTurkishTime,
  isFutureDate,
  formatTurkishTimeOnly,
  formatAdminDateTime,
} from '../../utils/dateUtils';

describe('dateUtils', () => {
  describe('formatWithTurkishTime', () => {
    it('returns empty string for null/undefined', () => {
      expect(formatWithTurkishTime(null)).toBe('');
      expect(formatWithTurkishTime(undefined)).toBe('');
    });

    it('returns formatted string for valid date', () => {
      const result = formatWithTurkishTime('2024-06-15T10:30:00');
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('isFutureDate', () => {
    it('returns false for null/undefined', () => {
      expect(isFutureDate(null, '10:00')).toBe(false);
      expect(isFutureDate('2024-06-15', null)).toBe(false);
    });

    it('returns false for past date', () => {
      expect(isFutureDate('2020-01-01', '10:00')).toBe(false);
    });
  });

  describe('formatTurkishTimeOnly', () => {
    it('returns empty string for null', () => {
      expect(formatTurkishTimeOnly(null)).toBe('');
    });
  });

  describe('formatAdminDateTime', () => {
    it('returns N/A for null', () => {
      expect(formatAdminDateTime(null)).toBe('N/A');
    });

    it('returns formatted string for valid date', () => {
      const result = formatAdminDateTime('2024-06-15T14:30:00');
      expect(result).toBeDefined();
      expect(result).not.toBe('N/A');
    });
  });
});
