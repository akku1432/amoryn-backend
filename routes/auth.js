const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const nodemailer = require('nodemailer');

// Welcome email function
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing EMAIL_USER or EMAIL_PASS in .env');
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Amoryn Dating" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🎉 Welcome to Amoryn - Your Dating Journey Begins!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Amoryn</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f8f9fa;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #ec294d, #d63384);
              color: white;
              text-align: center;
              padding: 40px 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 700;
            }
            .header p {
              margin: 10px 0 0 0;
              font-size: 18px;
              opacity: 0.9;
            }
            .content {
              padding: 40px 30px;
            }
            .welcome-message {
              font-size: 20px;
              color: #ec294d;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .description {
              font-size: 16px;
              color: #666;
              margin-bottom: 25px;
              line-height: 1.7;
            }
            .features {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 15px;
              margin: 25px 0;
            }
            .features h3 {
              color: #ec294d;
              margin-top: 0;
              font-size: 18px;
            }
            .feature-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .feature-list li {
              padding: 8px 0;
              color: #555;
              position: relative;
              padding-left: 25px;
            }
            .feature-list li:before {
              content: "✨";
              position: absolute;
              left: 0;
              color: #ec294d;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #ec294d, #d63384);
              color: white;
              text-decoration: none;
              padding: 15px 30px;
              border-radius: 25px;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
              transition: all 0.3s ease;
            }
            .cta-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(236, 41, 77, 0.3);
            }
            .footer {
              background: #f8f9fa;
              padding: 30px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .social-links {
              margin: 20px 0;
            }
            .social-links a {
              color: #ec294d;
              text-decoration: none;
              margin: 0 10px;
            }
            .contact-info {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e9ecef;
            }
            .contact-info p {
              margin: 5px 0;
            }
            @media (max-width: 600px) {
              .container {
                margin: 10px;
                border-radius: 15px;
              }
              .header {
                padding: 30px 15px;
              }
              .header h1 {
                font-size: 28px;
              }
              .content {
                padding: 30px 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Amoryn!</h1>
              <p>Your journey to find meaningful connections starts here</p>
            </div>
            
            <div class="content">
              <div class="welcome-message">
                Hello ${userName}! 👋
              </div>
              
              <div class="description">
                Welcome to Amoryn, the premier dating platform designed to help you find genuine connections, meaningful relationships, and lasting love. We're thrilled to have you join our community!
              </div>
              
              <div class="features">
                <h3>🚀 What's Next?</h3>
                <ul class="feature-list">
                  <li>Complete your profile to stand out</li>
                  <li>Discover amazing people in your area</li>
                  <li>Start meaningful conversations</li>
                  <li>Build genuine connections</li>
                  <li>Upgrade to Premium for unlimited features</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="https://amoryn.in" class="cta-button">
                  🚀 Start Your Journey
                </a>
              </div>
              
              <div class="description">
                <strong>Pro Tip:</strong> A complete profile with great photos increases your chances of making meaningful connections by up to 300%!
              </div>
            </div>
            
            <div class="footer">
              <div class="social-links">
                <a href="https://amoryn.in">🌐 Website</a>
                <a href="mailto:support@amoryn.in">📧 Support</a>
              </div>
              
              <div class="contact-info">
                <p><strong>Need Help?</strong></p>
                <p>📧 Email: support@amoryn.in</p>
                <p>💬 We're here to help you succeed!</p>
              </div>
              
              <p style="margin-top: 20px; font-size: 12px; color: #999;">
                © 2024 Amoryn. All rights reserved. This email was sent to ${userEmail}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

// Referral welcome email function
const sendReferralWelcomeEmail = async (userEmail, userName, referralCode) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing EMAIL_USER or EMAIL_PASS in .env');
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Amoryn Dating" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🎁 Welcome to Amoryn - You\'ve Unlocked 24 Hours of Premium!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Amoryn - Premium Unlocked!</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              margin: 0;
              padding: 0;
              background-color: #f8f9fa;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 20px;
              overflow: hidden;
              box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            }
            .header {
              background: linear-gradient(135deg, #ff6b35, #f7931e);
              color: white;
              text-align: center;
              padding: 40px 20px;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 700;
            }
            .header p {
              margin: 10px 0 0 0;
              font-size: 18px;
              opacity: 0.9;
            }
            .premium-badge {
              background: linear-gradient(135deg, #ffd700, #ffed4e);
              color: #333;
              padding: 15px;
              border-radius: 15px;
              margin: 20px 0;
              text-align: center;
              font-weight: bold;
              font-size: 18px;
            }
            .content {
              padding: 40px 30px;
            }
            .welcome-message {
              font-size: 20px;
              color: #ff6b35;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .description {
              font-size: 16px;
              color: #666;
              margin-bottom: 25px;
              line-height: 1.7;
            }
            .features {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 15px;
              margin: 25px 0;
            }
            .features h3 {
              color: #ff6b35;
              margin-top: 0;
              font-size: 18px;
            }
            .feature-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .feature-list li {
              padding: 8px 0;
              color: #555;
              position: relative;
              padding-left: 25px;
            }
            .feature-list li:before {
              content: "⭐";
              position: absolute;
              left: 0;
              color: #ff6b35;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #ff6b35, #f7931e);
              color: white;
              text-decoration: none;
              padding: 15px 30px;
              border-radius: 25px;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
              transition: all 0.3s ease;
            }
            .cta-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(255, 107, 53, 0.3);
            }
            .footer {
              background: #f8f9fa;
              padding: 30px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .social-links {
              margin: 20px 0;
            }
            .social-links a {
              color: #ff6b35;
              text-decoration: none;
              margin: 0 10px;
            }
            .contact-info {
              margin-top: 20px;
              padding-top: 20px;
              border-top: 1px solid #e9ecef;
            }
            .contact-info p {
              margin: 5px 0;
            }
            @media (max-width: 600px) {
              .container {
                margin: 10px;
                border-radius: 15px;
              }
              .header {
                padding: 30px 15px;
              }
              .header h1 {
                font-size: 28px;
              }
              .content {
                padding: 30px 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎁 Premium Unlocked!</h1>
              <p>Welcome to Amoryn with 24 Hours of Premium Access</p>
            </div>
            
            <div class="content">
              <div class="welcome-message">
                Hello ${userName}! 👋
              </div>
              
              <div class="premium-badge">
                🎉 CONGRATULATIONS! 🎉<br>
                You've unlocked 24 hours of Premium features using referral code: <strong>${referralCode}</strong>
              </div>
              
              <div class="description">
                Welcome to Amoryn! You're one of the lucky users who gets to experience all our premium features absolutely FREE for the next 24 hours. Make the most of this opportunity to discover amazing connections!
              </div>
              
              <div class="features">
                <h3>🚀 Your Premium Features (24 Hours):</h3>
                <ul class="feature-list">
                  <li>Unlimited likes and matches</li>
                  <li>Advanced search filters</li>
                  <li>See who liked you</li>
                  <li>Priority customer support</li>
                  <li>Video call features</li>
                  <li>And much more!</li>
                </ul>
              </div>
              
              <div class="description">
                <strong>⏰ Time is ticking!</strong> Your premium access expires in 24 hours. Complete your profile and start connecting with amazing people right away!
              </div>
              
              <div style="text-align: center;">
                <a href="https://amoryn.in" class="cta-button">
                  🚀 Start Your Premium Journey
                </a>
              </div>
              
              <div class="description">
                <strong>Pro Tip:</strong> A complete profile with great photos increases your chances of making meaningful connections by up to 300%!
              </div>
            </div>
            
            <div class="footer">
              <div class="social-links">
                <a href="https://amoryn.in">🌐 Website</a>
                <a href="mailto:support@amoryn.in">📧 Support</a>
              </div>
              
              <div class="contact-info">
                <p><strong>Need Help?</strong></p>
                <p>📧 Email: support@amoryn.in</p>
                <p>💬 We're here to help you succeed!</p>
              </div>
              
              <p style="margin-top: 20px; font-size: 12px; color: #999;">
                © 2024 Amoryn. All rights reserved. This email was sent to ${userEmail}
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Referral welcome email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending referral welcome email:', error);
    return false;
  }
};

// ====== Signup ======
router.post('/signup', async (req, res) => {
  try {
    const { name, email, gender, dob, lookingFor, password, referralCode } = req.body;

    if (!name || !email || !gender || !dob || !lookingFor || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Valid referral codes - you can modify this list
    const validReferralCodes = [
      'AMORYN23REF1',
      'AMORYN23REF2',
      'AMORYN23REF3',
      'AMORYN23REF4',
      'AMORYN23REF5',
      'AMORYN23REF6',
      'AMORYN23REF7',
      'AMORYN23REF8',
      'AMORYN23REF9',
      'AMORYN23REF10',
      'AMORYN23REF11',
      'AMORYN23REF12',
      'AMORYN23REF13',
      'AMORYN23REF14',
      'AMORYN23REF15'
    ];

    // Check if referral code is valid
    let referredBy = null;
    let isReferralPremium = false;
    let referralPremiumExpiry = null;
    let referralCodeError = null;
    
    if (referralCode && referralCode.trim()) {
      const cleanReferralCode = referralCode.trim().toUpperCase();
      
      if (validReferralCodes.includes(cleanReferralCode)) {
        isReferralPremium = true;
        referralPremiumExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        console.log(`Valid referral code used: ${cleanReferralCode} by ${email}`);
      } else {
        referralCodeError = `Invalid referral code: ${referralCode}. Please use a valid code or leave empty.`;
        console.log(`Invalid referral code attempted: ${referralCode} by ${email}`);
      }
    }

    // If referral code is invalid, return error
    if (referralCodeError) {
      return res.status(400).json({ 
        error: referralCodeError,
        validCodes: validReferralCodes // Optional: show valid codes to user
      });
    }

    const newUser = new User({
      name,
      email: email.trim().toLowerCase(),
      gender,
      dob: new Date(dob),
      lookingFor,
      password: hashedPassword,
      referralCode: referralCode ? referralCode.trim().toUpperCase() : null,
      referredBy,
      isReferralPremium,
      referralPremiumExpiry,
      isPremium: isReferralPremium, // Set premium if referral code used
    });

    await newUser.save();
    
    // Send appropriate email based on referral
    try {
      if (isReferralPremium) {
        await sendReferralWelcomeEmail(newUser.email, newUser.name, referralCode.trim().toUpperCase());
      } else {
        await sendWelcomeEmail(newUser.email, newUser.name);
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the signup if email fails
    }
    
    res.status(201).json({ 
      message: 'Signup successful',
      isReferralPremium,
      referralPremiumExpiry: referralPremiumExpiry ? referralPremiumExpiry.toISOString() : null
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// ====== Login ======
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if this is an admin login attempt
    if (email === 'support@amoryn.in') {
      // Admin authentication - check against hardcoded password hash
      // This password hash is for "Akkupalli@1432" - not visible in frontend
      const adminPasswordHash = '$2b$10$YourHashedPasswordHere'; // This will be replaced with actual hash
      
      // For now, we'll use a simple comparison for demo
      // In production, you should use proper password hashing
      if (password === 'Akkupalli@1432') {
        // Check if admin user exists, if not create one
        let adminUser = await User.findOne({ email: 'support@amoryn.in' });
        
        if (!adminUser) {
          // Create admin user if it doesn't exist
          const hashedPassword = await bcrypt.hash('Akkupalli@1432', 10);
          adminUser = new User({
            name: 'Admin',
            email: 'support@amoryn.in',
            gender: 'Other',
            dob: new Date('1990-01-01'),
            lookingFor: 'All',
            password: hashedPassword,
            isPremium: true, // Admin is always premium
          });
          await adminUser.save();
        }
        
        const token = jwt.sign({ userId: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, isAdmin: true });
        return;
      }
    }

    // Regular user login
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, isAdmin: false });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ====== Forgot Password ======
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const resetLink = `${BASE_URL}/reset-password/${token}`;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing EMAIL_USER or EMAIL_PASS in .env');
      return res.status(500).json({ message: 'Email credentials are not set' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Amoryn" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Link',
      html: `
        <p>Hello ${user.name},</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>This link will expire in 15 minutes.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Reset link sent to your email' });
  } catch (err) {
    console.error('Forgot Password error:', err);
    res.status(500).json({ message: 'Failed to send reset link' });
  }
});

// ====== Reset Password ======
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset Password error:', err);
    res.status(400).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
