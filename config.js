export const BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://api.amoryn.in'    // 👈 your backend domain
  : 'http://localhost:3000';   // 👈 local development
