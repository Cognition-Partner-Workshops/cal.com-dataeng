// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-min-32-chars-long-here-ci';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-min-32-chars-ci';
process.env.JWT_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.PORT = '3099';

jest.setTimeout(30000);
