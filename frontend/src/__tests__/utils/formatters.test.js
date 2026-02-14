import { formatValue } from '../../utils/formatters';

describe('formatters', () => {
  describe('formatValue', () => {
    it('returns "Not provided" for empty text', () => {
      expect(formatValue('', 'text')).toBe('Not provided');
      expect(formatValue('   ', 'text')).toBe('Not provided');
    });

    it('returns "No phone number provided" for empty phone', () => {
      expect(formatValue('', 'phone')).toBe('No phone number provided');
    });

    it('returns "Not specified" for empty gender', () => {
      expect(formatValue('', 'gender')).toBe('Not specified');
    });

    it('returns value as-is when not empty', () => {
      expect(formatValue('hello', 'text')).toBe('hello');
    });

    it('formats date type with toLocaleDateString', () => {
      const result = formatValue('2024-01-15', 'date');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });
  });
});
