const express = require('express');
const fs = require('fs');
const router = express.Router();
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const { attachSubscription } = require('../middleware/subscription');
const nodemailer = require('nodemailer');

// Profile completion welcome email function
const sendProfileCompletionEmail = async (userEmail, userName) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing EMAIL_USER or EMAIL_PASS in .env');
      return false;
    }

    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Amoryn Dating" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🎯 Profile Complete! You\'re Ready to Find Love on Amoryn',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Profile Complete - Amoryn</title>
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
              background: linear-gradient(135deg, #28a745, #20c997);
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
            .congrats-message {
              font-size: 20px;
              color: #28a745;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .description {
              font-size: 16px;
              color: #666;
              margin-bottom: 25px;
              line-height: 1.7;
            }
            .benefits {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 15px;
              margin: 25px 0;
            }
            .benefits h3 {
              color: #28a745;
              margin-top: 0;
              font-size: 18px;
            }
            .benefit-list {
              list-style: none;
              padding: 0;
              margin: 0;
            }
            .benefit-list li {
              padding: 8px 0;
              color: #555;
              position: relative;
              padding-left: 25px;
            }
            .benefit-list li:before {
              content: "🎯";
              position: absolute;
              left: 0;
              color: #28a745;
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
            .stats {
              background: linear-gradient(135deg, #ec294d, #d63384);
              color: white;
              padding: 25px;
              border-radius: 15px;
              margin: 25px 0;
              text-align: center;
            }
            .stats h3 {
              margin-top: 0;
              font-size: 20px;
            }
            .stats p {
              margin: 10px 0;
              font-size: 16px;
              opacity: 0.9;
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
              <h1>🎯 Profile Complete!</h1>
              <p>You're all set to find your perfect match</p>
            </div>
            
            <div class="content">
              <div class="congrats-message">
                Congratulations ${userName}! 🎉
              </div>
              
              <div class="description">
                Amazing! You've completed your profile on Amoryn. A complete profile significantly increases your chances of making meaningful connections and finding that special someone.
              </div>
              
              <div class="benefits">
                <h3>🚀 What This Means for You:</h3>
                <ul class="benefit-list">
                  <li>Higher visibility in search results</li>
                  <li>More profile views and likes</li>
                  <li>Better matching algorithm results</li>
                  <li>Increased chances of meaningful conversations</li>
                  <li>Professional appearance to potential matches</li>
                </ul>
              </div>
              
              <div class="stats">
                <h3>📊 Your Profile Stats</h3>
                <p><strong>Profile Completion:</strong> 100% ✅</p>
                <p><strong>Visibility Boost:</strong> +300% 🚀</p>
                <p><strong>Match Potential:</strong> Maximum ⭐</p>
              </div>
              
              <div style="text-align: center;">
                <a href="https://amoryn.in/dashboard" class="cta-button">
                  🚀 Start Matching Now
                </a>
              </div>
              
              <div class="description">
                <strong>Pro Tip:</strong> Now that your profile is complete, consider upgrading to Premium to unlock unlimited likes, advanced filters, and priority matching!
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
    console.log(`Profile completion email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending profile completion email:', error);
    return false;
  }
};

// Premium upgrade welcome email function
const sendPremiumUpgradeEmail = async (userEmail, userName, plan) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Missing EMAIL_USER or EMAIL_PASS in .env');
      return false;
    }

    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const planDisplay = plan === 'monthly' ? 'Monthly Premium' : 'Yearly Premium';
    const planDuration = plan === 'monthly' ? '30 days' : '365 days';

    const mailOptions = {
      from: `"Amoryn Dating" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '👑 Welcome to Premium! Unlock Unlimited Dating on Amoryn',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Premium Upgrade - Amoryn</title>
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
              background: linear-gradient(135deg, #ffd700, #ffed4e);
              color: #333;
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
              opacity: 0.8;
            }
            .content {
              padding: 40px 30px;
            }
            .congrats-message {
              font-size: 20px;
              color: #ffd700;
              font-weight: 600;
              margin-bottom: 20px;
            }
            .description {
              font-size: 16px;
              color: #666;
              margin-bottom: 25px;
              line-height: 1.7;
            }
            .plan-details {
              background: linear-gradient(135deg, #ffd700, #ffed4e);
              color: #333;
              padding: 25px;
              border-radius: 15px;
              margin: 25px 0;
              text-align: center;
            }
            .plan-details h3 {
              margin-top: 0;
              font-size: 20px;
              color: #333;
            }
            .plan-details p {
              margin: 10px 0;
              font-size: 16px;
              font-weight: 600;
            }
            .premium-features {
              background: #f8f9fa;
              padding: 25px;
              border-radius: 15px;
              margin: 25px 0;
            }
            .premium-features h3 {
              color: #ffd700;
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
              content: "👑";
              position: absolute;
              left: 0;
              color: #ffd700;
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
              <h1>👑 Premium Upgrade!</h1>
              <p>Welcome to the exclusive club</p>
            </div>
            
            <div class="content">
              <div class="congrats-message">
                Congratulations ${userName}! 🎉
              </div>
              
              <div class="description">
                You've just unlocked unlimited dating potential on Amoryn! As a Premium member, you now have access to all the advanced features that will help you find your perfect match faster and more effectively.
              </div>
              
              <div class="plan-details">
                <h3>📋 Your Premium Plan</h3>
                <p><strong>Plan:</strong> ${planDisplay}</p>
                <p><strong>Duration:</strong> ${planDuration}</p>
                <p><strong>Status:</strong> Active ✅</p>
              </div>
              
              <div class="premium-features">
                <h3>🚀 Premium Features Unlocked:</h3>
                <ul class="feature-list">
                  <li>Unlimited likes per day</li>
                  <li>Unlimited messaging to anyone</li>
                  <li>Advanced search filters</li>
                  <li>Priority in search results</li>
                  <li>See who liked you</li>
                  <li>Video call with matches</li>
                  <li>Profile boost features</li>
                  <li>Premium customer support</li>
                </ul>
              </div>
              
              <div style="text-align: center;">
                <a href="https://amoryn.in/dashboard" class="cta-button">
                  🚀 Start Using Premium Features
                </a>
              </div>
              
              <div class="description">
                <strong>Pro Tip:</strong> Premium members get 5x more profile views and 3x more matches on average. Make the most of your premium status!
              </div>
            </div>
            
            <div class="footer">
              <div class="social-links">
                <a href="https://amoryn.in">🌐 Website</a>
                <a href="mailto:support@amoryn.in">📧 Support</a>
              </div>
              
              <div class="contact-info">
                <p><strong>Premium Support</strong></p>
                <p>📧 Email: support@amoryn.in</p>
                <p>💬 Priority response for Premium users!</p>
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
    console.log(`Premium upgrade email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending premium upgrade email:', error);
    return false;
  }
};

// ---------- CORS (router-level) ----------
const allowedOrigins = ['https://www.amoryn.in', 'https://amoryn.in', 'http://localhost:3000'];
const corsOptions = {
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Content-Length'],
  maxAge: 86400,
};
router.use(cors(corsOptions));
// Handle all preflight requests (Express 5 + path-to-regexp v6 no longer accepts '*')
router.options(/.*/, cors(corsOptions));

// ---------- GridFS bucket (lazy init safe) ----------
let gfsBucket;
const getGfsBucket = () => {
  if (gfsBucket) return gfsBucket;
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'profilePictures',
    });
    return gfsBucket;
  }
  return null;
};
mongoose.connection.once('open', () => {
  getGfsBucket();
});

// ---------- Helpers ----------
const normalizeHobbies = (hobbies) => {
  if (Array.isArray(hobbies)) return hobbies;
  if (typeof hobbies === 'string') {
    const trimmed = hobbies.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [trimmed];
    }
  }
  return [];
};
const normalizeString = (value) => (typeof value === 'string' ? value : value ? String(value) : '');

// ✅ GET /profile
router.get('/profile', auth, attachSubscription, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      ...user.toObject(),
      isPremium: req.user.isPremium,
      plan: req.user.subscriptionPlan,
      subscription: req.user.subscription,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ✅ PUT /profile
router.put('/profile', auth, attachSubscription, upload.single('profilePicture'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { hobbies, smoking, drinking, relationshipType, bio, country, state, city } = req.body;

    // Debug logging
    console.log('Profile update request body:', req.body);
    console.log('Raw relationshipType:', relationshipType);
    console.log('Type of relationshipType:', typeof relationshipType);

    // Update text fields
    user.hobbies = normalizeHobbies(hobbies);
    user.smoking = normalizeString(smoking);
    user.drinking = normalizeString(drinking);
    user.relationshipType = normalizeHobbies(relationshipType); // Use normalizeHobbies for array fields
    user.bio = normalizeString(bio);
    user.country = normalizeString(country);
    user.state = normalizeString(state);
    user.city = normalizeString(city);

    // Debug logging after normalization
    console.log('Normalized relationshipType:', user.relationshipType);
    console.log('Type of normalized relationshipType:', typeof user.relationshipType);
    console.log('Is array?', Array.isArray(user.relationshipType));

    // Handle profile picture upload if provided
    if (req.file) {
      const bucket = getGfsBucket();
      if (!bucket) {
        return res.status(503).json({ error: 'Image storage not initialized' });
      }

      // Delete previous picture if exists
      if (user.profilePicture) {
        try {
          await bucket.delete(new mongoose.Types.ObjectId(user.profilePicture));
        } catch (err) {
          console.warn('Old profile picture delete error:', err.message);
        }
      }

      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        contentType: req.file.mimetype,
      });
      
      const fileId = uploadStream.id;
      
      if (!fileId) {
        console.error('GridFS upload stream ID is undefined');
        return res.status(500).json({ error: 'Failed to initialize upload stream' });
      }

      // Handle memory storage (buffer)
      if (req.file.buffer) {
        uploadStream.end(req.file.buffer);
      } else {
        return res.status(400).json({ error: 'Invalid upload payload' });
      }

      // Wait for upload to complete
      await new Promise((resolve, reject) => {
        uploadStream.on('finish', () => {
          user.profilePicture = fileId;
          resolve();
        });
        uploadStream.on('error', reject);
      });
    }

    await user.save();
    
    // Send profile completion email if this is the first time completing the profile
    // Check if user has completed essential profile fields
    const hasCompletedProfile = user.hobbies && user.hobbies.length > 0 && 
                               user.smoking && user.drinking && 
                               user.relationshipType && user.relationshipType.length > 0 && user.bio && 
                               user.country && user.state && user.city;
    
    if (hasCompletedProfile) {
      try {
        await sendProfileCompletionEmail(user.email, user.name);
      } catch (emailError) {
        console.error('Failed to send profile completion email:', emailError);
        // Don't fail the profile update if email fails
      }
    }
    
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('PUT /profile error:', err);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// ✅ POST /profile/picture - supports memory and disk storage
router.post('/profile/picture', auth, upload.single('profilePicture'), async (req, res) => {
  let tempFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const bucket = getGfsBucket();
    if (!bucket) {
      return res.status(503).json({ error: 'Image storage not initialized' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Delete previous picture if exists
    if (user.profilePicture) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(user.profilePicture));
      } catch (err) {
        console.warn('Old profile picture delete error:', err.message);
      }
    }

    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });
    
    // Get the file ID from the upload stream
    const fileId = uploadStream.id;
    
    if (!fileId) {
      console.error('GridFS upload stream ID is undefined');
      return res.status(500).json({ error: 'Failed to initialize upload stream' });
    }

    // Handle both memory storage (buffer) and disk storage (path)
    if (req.file.buffer) {
      uploadStream.end(req.file.buffer);
    } else if (req.file.path) {
      tempFilePath = req.file.path;
      fs.createReadStream(req.file.path).pipe(uploadStream);
    } else {
      return res.status(400).json({ error: 'Invalid upload payload' });
    }

    uploadStream.on('finish', async () => {
      try {
        console.log('GridFS upload finished, fileId:', fileId);
        user.profilePicture = fileId;
        await user.save();
        console.log('User profile picture updated successfully');

        if (tempFilePath) {
          fs.unlink(tempFilePath, (unlinkErr) => {
            if (unlinkErr) console.warn('Temp file cleanup error:', unlinkErr.message);
          });
        }

        res.json({ message: 'Profile picture updated', fileId: fileId });
      } catch (saveErr) {
        console.error('Error saving user with new profile picture:', saveErr);
        res.status(500).json({ error: 'Failed to save profile picture' });
      }
    });

    uploadStream.on('error', (err) => {
      console.error('GridFS upload error:', err);
      if (tempFilePath) {
        fs.unlink(tempFilePath, (unlinkErr) => {
          if (unlinkErr) console.warn('Temp file cleanup error:', unlinkErr.message);
        });
      }
      res.status(500).json({ error: 'Image upload failed' });
    });
  } catch (err) {
    console.error('POST /profile/picture error:', err);
    if (tempFilePath) {
      fs.unlink(tempFilePath, (unlinkErr) => {
        if (unlinkErr) console.warn('Temp file cleanup error:', unlinkErr.message);
      });
    }
    res.status(500).json({ error: 'Profile picture upload failed' });
  }
});

// ✅ GET /profile/picture/:userId
router.get('/profile/picture/:userId', async (req, res) => {
  try {
    const bucket = getGfsBucket();
    if (!bucket) return res.status(503).json({ error: 'Image storage not initialized' });

    const user = await User.findById(req.params.userId);
    if (!user || !user.profilePicture) return res.status(404).json({ error: 'Profile picture not found' });

    const fileId = new mongoose.Types.ObjectId(user.profilePicture);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (files && files[0]?.contentType) {
      res.set('Content-Type', files[0].contentType);
    }

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on('error', (err) => {
      console.error('GridFS download error:', err);
      res.status(404).json({ error: 'Image not found' });
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('GET /profile/picture/:userId error:', err);
    res.status(500).json({ error: 'Failed to fetch profile picture' });
  }
});

// Convenience: GET /profile/picture/me
router.get('/profile/picture/me', auth, async (req, res) => {
  try {
    const bucket = getGfsBucket();
    if (!bucket) return res.status(503).json({ error: 'Image storage not initialized' });

    const user = await User.findById(req.user._id);
    if (!user || !user.profilePicture) return res.status(404).json({ error: 'Profile picture not found' });

    const fileId = new mongoose.Types.ObjectId(user.profilePicture);
    const files = await bucket.find({ _id: fileId }).toArray();
    if (files && files[0]?.contentType) {
      res.set('Content-Type', files[0].contentType);
    }

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on('error', (err) => {
      console.error('GridFS download error:', err);
      res.status(404).json({ error: 'Image not found' });
    });
    downloadStream.pipe(res);
  } catch (err) {
    console.error('GET /profile/picture/me error:', err);
    res.status(500).json({ error: 'Failed to fetch profile picture' });
  }
});

// ✅ DELETE /delete (current user)
router.delete('/delete', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const bucket = getGfsBucket();
    if (user.profilePicture && bucket) {
      try {
        await bucket.delete(new mongoose.Types.ObjectId(user.profilePicture));
      } catch (err) {
        console.error('Error deleting GridFS file:', err.message);
      }
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: 'Account and profile picture deleted successfully' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ✅ GET Match Suggestions
router.get('/match', auth, attachSubscription, async (req, res) => {
  try {
    const genderMatch =
      req.user.lookingFor === 'both' ? ['male', 'female'] : [req.user.lookingFor];

    const excludeIds = [
      req.user._id,
      ...(req.user.likes || []),
      ...(req.user.dislikes || []),
    ];

    const matchedUsers = await User.find({
      _id: { $nin: excludeIds },
      gender: { $in: genderMatch },
    }).select('-password');

    // Add profile picture URLs to photos array for frontend compatibility
    const usersWithPhotos = matchedUsers.map(user => {
      const userObj = user.toObject();
      if (userObj.profilePicture) {
        userObj.photos = [`api/user/profile/picture/${userObj._id}`];
      } else {
        // Set a consistent structure to prevent blinking
        userObj.photos = null;
      }
      return userObj;
    });

    res.json({
      users: usersWithPhotos,
      isPremium: req.user.isPremium,
      plan: req.user.subscriptionPlan,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
});

// ✅ POST Like / Dislike
router.post('/match/action', auth, attachSubscription, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const { targetUserId, action } = req.body;

    if (!['like', 'dislike'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    if (targetUserId === currentUser._id.toString()) {
      return res.status(400).json({ error: 'Cannot act on yourself' });
    }

    if (
      (action === 'like' && currentUser.likes.includes(targetUserId)) ||
      (action === 'dislike' && currentUser.dislikes.includes(targetUserId))
    ) {
      return res.json({ success: true, message: `User already ${action}d` });
    }

    const today = new Date().toDateString();
    const lastLike = currentUser.lastLikeDate?.toDateString();

    if (!req.user.isPremium) {
      if (today !== lastLike) {
        currentUser.dailyLikeCount = 0;
        currentUser.lastLikeDate = new Date();
      }
      if (action === 'like' && currentUser.dailyLikeCount >= 10) {
        return res.status(403).json({
          error: 'Daily like limit reached. Upgrade to premium to continue.',
        });
      }
    }

    if (action === 'like') {
      currentUser.likes.push(targetUserId);
      if (!req.user.isPremium) currentUser.dailyLikeCount++;
      
      // Check if this creates a mutual friendship
      const targetUser = await User.findById(targetUserId);
      if (targetUser && targetUser.likes.includes(currentUser._id)) {
        // This is a mutual like - emit friend-request-accepted event
        const io = req.app.get('io');
        const userSocketMap = global.userSocketMap;
        const targetSocketId = userSocketMap.get(targetUserId);
        const currentUserSocketId = userSocketMap.get(currentUser._id);
        
        if (targetSocketId) {
          io.to(targetSocketId).emit('friend-request-accepted', {
            by: currentUser._id.toString(),
            message: `${currentUser.name || 'Someone'} liked you back! You're now friends.`
          });
        }
        
        if (currentUserSocketId) {
          io.to(currentUserSocketId).emit('friend-request-accepted', {
            by: targetUserId,
            message: `${targetUser.name || 'Someone'} liked you back! You're now friends.`
          });
        }
      }
    } else {
      currentUser.dislikes.push(targetUserId);
    }

    await currentUser.save();

    if (action === 'like') {
      const io = req.app.get('io');
      const userSocketMap = global.userSocketMap;
      const recipientSocketId = userSocketMap.get(targetUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('new-like', {
          from: req.user._id.toString(),
          message: `${req.user.name || 'Someone'} liked your profile.`,
        });
      }
    }

    res.json({ success: true, message: `User ${action}d` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process action' });
  }
});

// ✅ GET Friends (Mutual Likes)
router.get('/friends', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).lean();
    const iLiked = currentUser.likes.map(id => id.toString());

    const usersWhoLikedMe = await User.find({ likes: req.user._id }).select('-password');
    const mutualFriends = usersWhoLikedMe.filter(u => iLiked.includes(u._id.toString()));

    // Add profile picture URLs to photos array for frontend compatibility
    const friendsWithPhotos = mutualFriends.map(user => {
      const userObj = user.toObject();
      if (userObj.profilePicture) {
        userObj.photos = [`api/user/profile/picture/${userObj._id}`];
      } else {
        // Set a consistent structure to prevent blinking
        userObj.photos = null;
      }
      return userObj;
    });

    res.json(friendsWithPhotos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// ✅ GET Requests
router.get('/requests', auth, attachSubscription, async (req, res) => {
  try {
    const usersWhoLikedMe = await User.find({ likes: req.user._id }).select('-password');
    const pending = usersWhoLikedMe.filter(
      u => !req.user.likes.includes(u._id.toString())
    );

    // Add profile picture URLs to photos array for frontend compatibility
    const requestsWithPhotos = pending.map(user => {
      const userObj = user.toObject();
      if (userObj.profilePicture) {
        userObj.photos = [`api/user/profile/picture/${userObj._id}`];
      } else {
        // Set a consistent structure to prevent blinking
        userObj.photos = null;
      }
      return userObj;
    });

    res.json(requestsWithPhotos);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// ✅ POST /subscribe
router.post('/subscribe', auth, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['monthly', 'yearly'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan selected' });
    }

    if (!req.user?._id) {
      return res.status(400).json({ error: 'User ID missing from token' });
    }
    console.log('Subscribe request userId:', req.user._id);

    const duration = plan === 'monthly' ? 30 : 365;
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + duration);

    const subscription = await Subscription.findOneAndUpdate(
      { userId: req.user._id },
      { userId: req.user._id, plan, startDate, endDate, isActive: true },
      { upsert: true, new: true, runValidators: true }
    );

    // Send premium upgrade welcome email
    try {
      const user = await User.findById(req.user._id);
      if (user) {
        await sendPremiumUpgradeEmail(user.email, user.name, plan);
      }
    } catch (emailError) {
      console.error('Failed to send premium upgrade email:', emailError);
      // Don't fail the subscription activation if email fails
    }

    res.json({ message: 'Subscription activated', subscription });
  } catch (err) {
    console.error('Subscription activation error:', err);
    console.error(err.stack);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

// ✅ GET /subscribe
router.get('/subscribe', auth, async (req, res) => {
  try {
    const sub = await Subscription.findOne({
      userId: req.user._id,
      isActive: true,
      endDate: { $gte: new Date() },
    });

    if (!sub) return res.json({ active: false });

    res.json({
      active: true,
      plan: sub.plan,
      startDate: sub.startDate,
      endDate: sub.endDate,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

module.exports = router;