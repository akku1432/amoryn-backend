const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const auth = require('../middleware/auth');
const { attachSubscription } = require('../middleware/subscription');

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

// POST toggle premium status
router.post('/premium', async (req, res) => {
  try {
    const { userId, action } = req.body;
    
    if (!userId || !['add', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    if (action === 'add') {
      // Add premium subscription
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 365); // 1 year premium

      await Subscription.findOneAndUpdate(
        { userId },
        { 
          userId, 
          plan: 'yearly', 
          startDate, 
          endDate, 
          isActive: true 
        },
        { upsert: true, new: true, runValidators: true }
      );

      // Update user model
      await User.findByIdAndUpdate(userId, { isPremium: true });
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
