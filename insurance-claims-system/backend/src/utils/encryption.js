const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENCODING = 'hex';

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  if (key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  return crypto.createHash('sha256').update(key).digest();
}

function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(String(plaintext), 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);

  const tag = cipher.getAuthTag();
  return `${iv.toString(ENCODING)}:${tag.toString(ENCODING)}:${encrypted}`;
}

function decrypt(ciphertext) {
  if (!ciphertext) return ciphertext;
  try {
    const key = getEncryptionKey();
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext;

    const iv = Buffer.from(parts[0], ENCODING);
    const tag = Buffer.from(parts[1], ENCODING);
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, ENCODING, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error.message);
    return ciphertext;
  }
}

function maskSSN(ssn) {
  if (!ssn || ssn.length < 4) return '****';
  return `****${ssn.slice(-4)}`;
}

function maskEmail(email) {
  if (!email) return '****';
  const parts = email.split('@');
  if (parts.length !== 2) return '****';
  const name = parts[0];
  const masked = name.substring(0, 2) + '***';
  return `${masked}@${parts[1]}`;
}

function maskPhone(phone) {
  if (!phone || phone.length < 4) return '****';
  return `****${phone.slice(-4)}`;
}

module.exports = { encrypt, decrypt, maskSSN, maskEmail, maskPhone };
