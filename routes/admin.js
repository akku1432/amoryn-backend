const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const auth = require('../middleware/auth');
const { attachSubscription } = require('../middleware/subscription');
const nodemailer = require('nodemailer');

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
      subject: '👑 Premium Access Granted by Admin - Welcome to Premium!',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Premium Access Granted - Amoryn</title>
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
            .admin-notice {
              background: #e3f2fd;
              border: 2px solid #2196f3;
              padding: 20px;
              border-radius: 15px;
              margin: 25px 0;
              text-align: center;
            }
            .admin-notice h3 {
              color: #2196f3;
              margin-top: 0;
              font-size: 18px;
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
              <h1>👑 Premium Access Granted!</h1>
              <p>Welcome to the exclusive club</p>
            </div>
            
            <div class="content">
              <div class="congrats-message">
                Congratulations ${userName}! 🎉
              </div>
              
              <div class="description">
                Great news! An Amoryn administrator has granted you premium access to our platform. You now have access to all the advanced features that will help you find your perfect match faster and more effectively.
              </div>
              
              <div class="admin-notice">
                <h3>🎯 Admin Grant Notice</h3>
                <p>Your premium access was granted by our admin team. This is a special privilege that gives you immediate access to all premium features.</p>
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
    console.log(`Admin premium upgrade email sent to ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending admin premium upgrade email:', error);
    return false;
  }
};

// Admin middleware to check if user is admin
const adminAuth = async (req, res, next) => {
  try {
    // Check if user is admin (support@amoryn.in)
    if (req.user.email !== 'support@amoryn.in') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    res.status(500).json({ error: 'Admin verification failed' });
  }
};

// Apply admin authentication to all routes
router.use(auth, attachSubscription, adminAuth);

// GET all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}).select('-password').lean();
    
    // Add premium status and other flags
    const usersWithStatus = users.map(user => ({
      ...user,
      isPremium: false, // Will be updated below
      isBlocked: user.isBlocked || false,
      isSuspended: user.isSuspended || false,
    }));

    // Check premium status for each user
    for (let user of usersWithStatus) {
      const subscription = await Subscription.findOne({
        userId: user._id,
        endDate: { $gte: new Date() }
      });
      user.isPremium = !!subscription;
    }

    res.json(usersWithStatus);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET newly registered users with referral codes (admin only)
router.get('/new-users', async (req, res) => {
  try {
    // Get users registered in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsers = await User.find({
      createdAt: { $gte: thirtyDaysAgo }
    }).select('-password').lean();
    
    // Add premium status and referral information
    const newUsersWithDetails = newUsers.map(user => ({
      ...user,
      isPremium: false, // Will be updated below
      isReferralPremium: user.isReferralPremium || false,
      referralCode: user.referralCode || null,
      referralPremiumExpiry: user.referralPremiumExpiry || null,
      isBlocked: user.isBlocked || false,
      isSuspended: user.isSuspended || false,
    }));

    // Check premium status for each user
    for (let user of newUsersWithDetails) {
      const subscription = await Subscription.findOne({
        userId: user._id,
        endDate: { $gte: new Date() }
      });
      user.isPremium = !!subscription;
    }

    // Sort by creation date (newest first)
    newUsersWithDetails.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      users: newUsersWithDetails,
      total: newUsersWithDetails.length,
      period: 'Last 30 days'
    });
  } catch (err) {
    console.error('Error fetching new users:', err);
    res.status(500).json({ error: 'Failed to fetch new users' });
  }
});

// GET referral codes management (admin only)
router.get('/referral-codes', async (req, res) => {
  try {
    // Get all users who used referral codes
    const referralUsers = await User.find({
      referralCode: { $exists: true, $ne: null }
    }).select('referralCode email name createdAt isReferralPremium referralPremiumExpiry').lean();
    
    // Count usage of each referral code
    const referralCodeStats = {};
    referralUsers.forEach(user => {
      const code = user.referralCode;
      if (!referralCodeStats[code]) {
        referralCodeStats[code] = {
          code: code,
          usageCount: 0,
          activeUsers: 0,
          users: []
        };
      }
      referralCodeStats[code].usageCount++;
      referralCodeStats[code].users.push({
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        isReferralPremium: user.isReferralPremium,
        referralPremiumExpiry: user.referralPremiumExpiry
      });
      
      // Check if user still has active referral premium
      if (user.isReferralPremium && user.referralPremiumExpiry && new Date(user.referralPremiumExpiry) > new Date()) {
        referralCodeStats[code].activeUsers++;
      }
    });
    
    // Convert to array and sort by usage
    const referralCodesArray = Object.values(referralCodeStats).sort((a, b) => b.usageCount - a.usageCount);
    
    res.json({
      referralCodes: referralCodesArray,
      totalCodes: referralCodesArray.length,
      totalUsage: referralUsers.length
    });
  } catch (err) {
    console.error('Error fetching referral codes:', err);
    res.status(500).json({ error: 'Failed to fetch referral codes' });
  }
});

// POST toggle premium status
router.post('/premium', async (req, res) => {
  try {
    const { userId, action, duration } = req.body;
    
    if (!userId || !['add', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    if (action === 'add') {
      // Validate duration
      if (!duration || !['1month', '1year'].includes(duration)) {
        return res.status(400).json({ error: 'Duration must be 1month or 1year' });
      }

      // Add premium subscription with specified duration
      const startDate = new Date();
      const endDate = new Date();
      
      if (duration === '1month') {
        endDate.setMonth(startDate.getMonth() + 1); // 1 month
      } else {
        endDate.setFullYear(startDate.getFullYear() + 1); // 1 year
      }

      const plan = duration === '1month' ? 'monthly' : 'yearly';

      await Subscription.findOneAndUpdate(
        { userId },
        { 
          userId, 
          plan, 
          startDate, 
          endDate, 
          isActive: true 
        },
        { upsert: true, new: true, runValidators: true }
      );

      // Update user model
      await User.findByIdAndUpdate(userId, { isPremium: true });

      // Send welcome email if premium is added
      const user = await User.findById(userId);
      if (user && user.email) {
        await sendPremiumUpgradeEmail(user.email, user.name, plan);
      }
    } else {
      // Remove premium subscription
      await Subscription.findOneAndDelete({ userId });
      await User.findByIdAndUpdate(userId, { isPremium: false });
    }

    res.json({ 
      success: true, 
      message: `Premium ${action === 'add' ? 'added to' : 'removed from'} user successfully` 
    });
  } catch (err) {
    console.error('Error updating premium status:', err);
    res.status(500).json({ error: 'Failed to update premium status' });
  }
});

// POST block/unblock user
router.post('/block', async (req, res) => {
  try {
    const { userId, action } = req.body;
    
    if (!userId || !['block', 'unblock'].includes(action)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const isBlocked = action === 'block';
    await User.findByIdAndUpdate(userId, { isBlocked });

    res.json({ 
      success: true, 
      message: `User ${action === 'block' ? 'blocked' : 'unblocked'} successfully` 
    });
  } catch (err) {
    console.error('Error updating user block status:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// POST suspend/unsuspend user
router.post('/suspend', async (req, res) => {
  try {
    const { userId, action } = req.body;
    
    if (!userId || !['suspend', 'unsuspend'].includes(action)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const isSuspended = action === 'suspend';
    await User.findByIdAndUpdate(userId, { isSuspended });

    res.json({ 
      success: true, 
      message: `User ${action === 'suspend' ? 'suspended' : 'unsuspended'} successfully` 
    });
  } catch (err) {
    console.error('Error updating user suspend status:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// GET user statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const premiumUsers = await Subscription.countDocuments({
      endDate: { $gte: new Date() }
    });
    const blockedUsers = await User.countDocuments({ isBlocked: true });
    const suspendedUsers = await User.countDocuments({ isSuspended: true });

    res.json({
      totalUsers,
      premiumUsers,
      blockedUsers,
      suspendedUsers,
      freeUsers: totalUsers - premiumUsers
    });
  } catch (err) {
    console.error('Error fetching admin stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
