// Use CommonJS so it can be required from Node without transpilation
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.amoryn.in'    // backend API
  : 'http://localhost:5000';   // local development

/** Where users open the app (password reset links must use this, not the API host). */
const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://amoryn.in'
    : 'http://localhost:3000');

module.exports = { BASE_URL, FRONTEND_URL };
