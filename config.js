// Use CommonJS so it can be required from Node without transpilation
const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.amoryn.in'    // your backend domain
  : 'http://localhost:5000';   // local development

module.exports = { BASE_URL };
