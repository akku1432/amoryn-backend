const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const auth = require('../middleware/auth');
// NOTE: require the uploads middleware file (matches your middleware/uploads.js)
const upload = require('../middleware/upload');
const { attachSubscription } = require('../middleware/subscription');

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
router.put('/profile', auth, attachSubscription, upload.array('photos', 5), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const {
      hobbies,
      smoking,
      drinking,
      relationshipType,
      bio,
      country,
      state,
      city,
      existingPhotos,
    } = req.body;

    user.hobbies = hobbies ? JSON.parse(hobbies) : [];
    user.smoking = smoking || '';
    user.drinking = drinking || '';
    user.relationshipType = relationshipType || '';
    user.bio = bio || '';
    user.country = country || '';
    user.state = state || '';
    user.city = city || '';

    // Parse saved/existing photos from client
    const savedPhotos = existingPhotos ? JSON.parse(existingPhotos) : [];

    // Save new photos as relative 'uploads/<filename>' paths so frontend can access via BASE_URL/uploads/...
    const newPhotos = (req.files || []).map(f => `uploads/${path.basename(f.path)}`);

    const totalPhotos = savedPhotos.length + newPhotos.length;

    if (totalPhotos > 5) {
      return res.status(400).json({ error: 'Maximum 5 photos allowed' });
    }

    user.photos = [...savedPhotos, ...newPhotos];
    await user.save();

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// ✅ DELETE /photo/:filename
router.delete('/photo/:filename', auth, async (req, res) => {
  try {
    const filename = req.params.filename;
    const photoPath = path.join(__dirname, '..', 'uploads', filename);

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.photos = (user.photos || []).filter(p => !p.includes(filename));
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);

    await user.save();
    res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete photo' });
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

    res.json({
      users: matchedUsers,
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

    res.json(mutualFriends);
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

    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// ✅ POST /subscribe (create or update subscription)
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
      {
        userId: req.user._id,
        plan,
        startDate,
        endDate,
        isActive: true,
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ message: 'Subscription activated', subscription });
  } catch (err) {
    console.error('Subscription activation error:', err);
    console.error(err.stack);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

// ✅ GET /subscribe - current active subscription
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
