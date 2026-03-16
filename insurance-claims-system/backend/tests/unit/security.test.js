const { sanitizeObject } = require('../../src/middleware/security');

describe('Security Middleware', () => {
  describe('sanitizeObject', () => {
    it('should sanitize XSS in strings', () => {
      const input = { name: '<script>alert("xss")</script>' };
      const result = sanitizeObject(input);
      expect(result.name).not.toContain('<script>');
    });

    it('should handle nested objects', () => {
      const input = { user: { name: '<img onerror="alert(1)" src=x>' } };
      const result = sanitizeObject(input);
      expect(result.user.name).not.toContain('onerror');
    });

    it('should handle arrays', () => {
      const input = { tags: ['<script>alert(1)</script>', 'safe'] };
      const result = sanitizeObject(input);
      expect(result.tags[0]).not.toContain('<script>');
      expect(result.tags[1]).toBe('safe');
    });

    it('should preserve non-string values', () => {
      const input = { count: 42, active: true, data: null };
      const result = sanitizeObject(input);
      expect(result.count).toBe(42);
      expect(result.active).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle empty objects', () => {
      expect(sanitizeObject({})).toEqual({});
    });

    it('should handle nested arrays with objects containing XSS', () => {
      const input = { items: [{ name: '<script>alert("xss")</script>' }] };
      const result = sanitizeObject(input);
      expect(result.items[0].name).not.toContain('<script>');
    });

    it('should handle numeric array values', () => {
      const input = { scores: [1, 2, 3] };
      const result = sanitizeObject(input);
      expect(result.scores).toEqual([1, 2, 3]);
    });
  });
});
