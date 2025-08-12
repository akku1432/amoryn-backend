const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');
const { BASE_URL } = require('../config'); // ✅ Add this if you store BASE_URL in config

// GET all chat partners
router.get('/conversations', auth, async (req, res) => {
  try {
    const currentUserId = req.user._id;

    // Get users with existing messages
    const sentTo = await Message.distinct('to', { from: currentUserId });
    const receivedFrom = await Message.distinct('from', { to: currentUserId });
    const messageUserIds = [...new Set([...sentTo, ...receivedFrom])];

    // Get users that the current user has liked (potential matches)
    const currentUser = await User.findById(currentUserId).select('likes');
    const likedUserIds = currentUser.likes || [];

    // Combine both sets of users
    const allUserIds = [...new Set([...messageUserIds, ...likedUserIds])];

    const users = await User.find({
      _id: { $in: allUserIds, $ne: currentUserId }
    }).select('name photos profilePicture');

    const formatted = users.map(u => {
      let photoUrl = null;
      
      // If user has profilePicture, use it
      if (u.profilePicture) {
        photoUrl = `${BASE_URL}/api/user/profile/picture/${u._id}`;
      }
      // If user has photos array, use the first photo
      else if (u.photos && u.photos.length > 0) {
        photoUrl = `${BASE_URL}/${u.photos[0].replace(/^\//, '')}`;
      }
      
      return {
        _id: u._id,
        name: u.name,
        photo: photoUrl
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

// GET chat history
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const current = req.user._id;
    const otherUser = req.params.userId;

    const messages = await Message.find({
      $or: [
        { from: current, to: otherUser },
        { from: otherUser, to: current }
      ]
    }).sort({ createdAt: 1 });

    await Message.updateMany(
      { from: otherUser, to: current, read: false },
      { $set: { read: true } }
    );

    // Emit message-read event to update notification counts
    const io = req.app.get('io');
    const userSocketMap = global.userSocketMap;
    const currentUserSocketId = userSocketMap.get(current.toString());
    
    if (currentUserSocketId) {
      io.to(currentUserSocketId).emit('message-read', {
        from: otherUser.toString(),
        to: current.toString()
      });
    }

    const formatted = messages.map(m => ({
      fromSelf: m.from.toString() === current.toString(),
      message: m.message,
      timestamp: m.createdAt
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// Send a message — allowed only for premium users
router.post('/send', auth, async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!req.user?.isPremium) {
      return res.status(403).json({ error: 'Only premium users can send messages' });
    }

    if (!to || !message) return res.status(400).json({ error: 'Missing recipient or message' });

    const msg = new Message({
      from: req.user._id,
      to,
      message,
      read: false,
    });

    await msg.save();

    const io = req.app.get('io');
    const userSocketMap = global.userSocketMap;
    const recipientSocketId = userSocketMap.get(to.toString());

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('new-message', {
        from: req.user._id.toString(),
        message,
      });
    }

    res.json({ success: true, savedMessage: msg });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET unread message counts
router.get('/unread', auth, async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const unreadCountsRaw = await Message.aggregate([
      { $match: { to: currentUserId, read: false } },
      { $group: { _id: '$from', count: { $sum: 1 } } }
    ]);

    const unreadCounts = {};
    unreadCountsRaw.forEach(({ _id, count }) => {
      unreadCounts[_id.toString()] = count;
    });

    res.json(unreadCounts);
  } catch (err) {
    console.error('Error fetching unread messages:', err);
    res.status(500).json({ error: 'Failed to fetch unread messages' });
  }
});

module.exports = router;
