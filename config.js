export const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.amoryn.in'    // 👈 your backend domain
  : 'http://localhost:5000';   // 👈 local development
