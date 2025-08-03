const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Message = require('../models/Message');

// GET conversations endpoint
router.get('/conversations', auth, async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const sentTo = await Message.distinct('to', { from: currentUserId });
    const receivedFrom = await Message.distinct('from', { to: currentUserId });

    const userIds = [...new Set([...sentTo, ...receivedFrom])];

    const users = await User.find({
      _id: { $in: userIds, $ne: currentUserId }
    }).select('name photos');

    const formatted = users.map(u => ({
      _id: u._id,
      name: u.name,
      photo: u.photos?.length ? `${BASE_URL}/${u.photos[0].replace(/\\/g, '/')}` : null
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

// GET messages between current user and otherUser, mark unread as read
router.get('/messages/:userId', auth, async (req, res) => {
  try {
    const current = req.user._id;
    const otherUser = req.params.userId;

    // Fetch messages between the two users
    const messages = await Message.find({
      $or: [
        { from: current, to: otherUser },
        { from: otherUser, to: current }
      ]
    }).sort('createdAt');

    // Mark all unread messages from otherUser to currentUser as read
    await Message.updateMany(
      { from: otherUser, to: current, read: false },
      { $set: { read: true } }
    );

    res.json(
      messages.map(m => ({
        fromSelf: m.from.toString() === current.toString(),
        message: m.message,
        timestamp: m.createdAt
      }))
    );
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

// POST send message endpoint
router.post('/send', auth, async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!req.user || !req.user._id) return res.status(401).json({ error: 'Not authenticated' });
    if (!to || !message) return res.status(400).json({ error: 'Missing recipient or message' });

    const msg = new Message({
      from: req.user._id,
      to,
      message,
      read: false, // new messages are unread by default
    });

    await msg.save();

    // Emit notification via socket.io
    const io = req.app.get('io');
    const userSocketMap = global.userSocketMap;
    const recipientSocketId = userSocketMap.get(to.toString());

    if (recipientSocketId) {
      io.to(recipientSocketId).emit('new-message', {
        from: req.user._id.toString(),
        message,
        chatId: req.user._id.toString() === to.toString() ? to : req.user._id.toString()
      });
    }

    res.json({ success: true, savedMessage: msg });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET unread message counts per user
router.get('/unread', auth, async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const unreadCountsRaw = await Message.aggregate([
      { $match: { to: currentUserId, read: false } },
      { $group: { _id: '$from', count: { $sum: 1 } } }
    ]);

    // Format as { userId: count }
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
