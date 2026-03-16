const { encrypt, decrypt, maskSSN, maskEmail, maskPhone } = require('../../src/utils/encryption');

describe('Encryption Utils', () => {
  const testData = 'sensitive-pii-data';
  const testSSN = '123-45-6789';
  const testEmail = 'john.doe@safeguard.com';
  const testPhone = '(555) 123-4567';

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const encrypted = encrypt(testData);
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(testData);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(testData);
    });

    it('should produce different ciphertexts for same plaintext', () => {
      const encrypted1 = encrypt(testData);
      const encrypted2 = encrypt(testData);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should return falsy values as-is', () => {
      expect(encrypt('')).toBe('');
      expect(encrypt(null)).toBe(null);
      expect(encrypt(undefined)).toBe(undefined);
      expect(decrypt('')).toBe('');
      expect(decrypt(null)).toBe(null);
    });

    it('should handle special characters', () => {
      const special = 'Héllo Wörld! @#$%^&*()';
      const encrypted = encrypt(special);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(special);
    });

    it('should handle long strings', () => {
      const longStr = 'A'.repeat(10000);
      const encrypted = encrypt(longStr);
      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(longStr);
    });

    it('should return encrypted string in iv:tag:ciphertext format', () => {
      const encrypted = encrypt(testData);
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(3);
    });

    it('should return invalid encrypted data as-is (graceful fallback)', () => {
      // decrypt returns the input if it can't decrypt (only 1 or 2 parts)
      expect(decrypt('invalid')).toBe('invalid');
      expect(decrypt('a:b')).toBe('a:b');
    });
  });

  describe('maskSSN', () => {
    it('should mask SSN correctly', () => {
      expect(maskSSN(testSSN)).toBe('****6789');
    });

    it('should handle null/undefined', () => {
      expect(maskSSN(null)).toBe('****');
      expect(maskSSN(undefined)).toBe('****');
    });

    it('should mask short strings', () => {
      expect(maskSSN('12')).toBe('****');
    });
  });

  describe('maskEmail', () => {
    it('should mask email correctly', () => {
      const masked = maskEmail(testEmail);
      expect(masked).toContain('@');
      expect(masked).toContain('***');
      expect(masked).not.toBe(testEmail);
    });

    it('should handle null/undefined', () => {
      expect(maskEmail(null)).toBe('****');
      expect(maskEmail(undefined)).toBe('****');
    });
  });

  describe('maskPhone', () => {
    it('should mask phone correctly', () => {
      const masked = maskPhone(testPhone);
      expect(masked).toContain('****');
      expect(masked).not.toBe(testPhone);
    });

    it('should handle null/undefined', () => {
      expect(maskPhone(null)).toBe('****');
      expect(maskPhone(undefined)).toBe('****');
    });
  });
});
