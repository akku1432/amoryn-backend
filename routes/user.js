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
router.put('/profile', auth, attachSubscription, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { hobbies, smoking, drinking, relationshipType, bio, country, state, city } = req.body;

    user.hobbies = normalizeHobbies(hobbies);
    user.smoking = normalizeString(smoking);
    user.drinking = normalizeString(drinking);
    user.relationshipType = normalizeString(relationshipType);
    user.bio = normalizeString(bio);
    user.country = normalizeString(country);
    user.state = normalizeString(state);
    user.city = normalizeString(city);

    await user.save();
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
        userObj.photos = [`/api/user/profile/picture/${userObj._id}`];
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
        userObj.photos = [`/api/user/profile/picture/${userObj._id}`];
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
        userObj.photos = [`/api/user/profile/picture/${userObj._id}`];
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