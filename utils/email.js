const User = require('../models/User');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(normalizeEmail(email));
}

async function findUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  return User.findOne({
    $expr: { $eq: [{ $toLower: { $ifNull: ['$email', ''] } }, normalized] },
  });
}

module.exports = { normalizeEmail, isValidEmail, findUserByEmail };
