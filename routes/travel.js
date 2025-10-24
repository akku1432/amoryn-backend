const express = require('express');
const router = express.Router();
const TravelPlan = require('../models/TravelPlan');
const User = require('../models/User');
const auth = require('../middleware/auth');

// ✅ GET All Travel Plans (Public - all users can view)
router.get('/plans', async (req, res) => {
  try {
    const { destination, gender, budgetRange, interests, startDate, endDate } = req.query;
    
    // Build filter object
    let filter = { isActive: true };
    
    // Filter by destination (case-insensitive partial match)
    if (destination) {
      filter.destination = { $regex: destination, $options: 'i' };
    }
    
    // Filter by budget
    if (budgetRange) {
      filter.budget = budgetRange;
    }
    
    // Filter by interests
    if (interests) {
      const interestArray = Array.isArray(interests) ? interests : [interests];
      filter.interests = { $in: interestArray };
    }
    
    // Filter by date range
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) {
        filter.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.startDate.$lte = new Date(endDate);
      }
    }
    
    // Get travel plans and populate user info
    let travelPlans = await TravelPlan.find(filter)
      .populate('userId', 'name email gender profilePicture isPremium city country bio')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Filter by gender if specified
    if (gender) {
      travelPlans = travelPlans.filter(plan => plan.userId && plan.userId.gender === gender);
    }
    
    // Add profile picture URLs
    const plansWithPhotos = travelPlans.map(plan => {
      const planObj = plan.toObject();
      if (planObj.userId && planObj.userId._id) {
        planObj.userId.photo = planObj.userId.profilePicture 
          ? `api/user/profile/picture/${planObj.userId._id}`
          : null;
      }
      return planObj;
    });
    
    res.json({
      success: true,
      plans: plansWithPhotos,
      count: plansWithPhotos.length,
    });
  } catch (err) {
    console.error('Error fetching travel plans:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch travel plans' 
    });
  }
});

// ✅ GET User's Own Travel Plans (Authenticated)
router.get('/my-plans', auth, async (req, res) => {
  try {
    const travelPlans = await TravelPlan.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      plans: travelPlans,
    });
  } catch (err) {
    console.error('Error fetching user travel plans:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch your travel plans' 
    });
  }
});

// ✅ POST Create Travel Plan (Authenticated)
router.post('/plans', auth, async (req, res) => {
  try {
    const { destination, startDate, endDate, budget, interests, description } = req.body;
    
    // Validation
    if (!destination || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        error: 'Destination, start date, and end date are required' 
      });
    }
    
    // Check date validity
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end <= start) {
      return res.status(400).json({ 
        success: false,
        error: 'End date must be after start date' 
      });
    }
    
    // Create new travel plan
    const travelPlan = new TravelPlan({
      userId: req.user.userId,
      destination,
      startDate: start,
      endDate: end,
      budget: budget || 'Flexible',
      interests: interests || [],
      description: description || '',
    });
    
    await travelPlan.save();
    
    res.status(201).json({
      success: true,
      message: 'Travel plan created successfully!',
      plan: travelPlan,
    });
  } catch (err) {
    console.error('Error creating travel plan:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to create travel plan' 
    });
  }
});

// ✅ PUT Update Travel Plan (Authenticated)
router.put('/plans/:id', auth, async (req, res) => {
  try {
    const { destination, startDate, endDate, budget, interests, description, isActive } = req.body;
    
    // Find travel plan
    const travelPlan = await TravelPlan.findById(req.params.id);
    
    if (!travelPlan) {
      return res.status(404).json({ 
        success: false,
        error: 'Travel plan not found' 
      });
    }
    
    // Check ownership
    if (travelPlan.userId.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'You can only update your own travel plans' 
      });
    }
    
    // Update fields
    if (destination) travelPlan.destination = destination;
    if (startDate) travelPlan.startDate = new Date(startDate);
    if (endDate) travelPlan.endDate = new Date(endDate);
    if (budget) travelPlan.budget = budget;
    if (interests) travelPlan.interests = interests;
    if (description !== undefined) travelPlan.description = description;
    if (isActive !== undefined) travelPlan.isActive = isActive;
    
    await travelPlan.save();
    
    res.json({
      success: true,
      message: 'Travel plan updated successfully!',
      plan: travelPlan,
    });
  } catch (err) {
    console.error('Error updating travel plan:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to update travel plan' 
    });
  }
});

// ✅ DELETE Travel Plan (Authenticated)
router.delete('/plans/:id', auth, async (req, res) => {
  try {
    const travelPlan = await TravelPlan.findById(req.params.id);
    
    if (!travelPlan) {
      return res.status(404).json({ 
        success: false,
        error: 'Travel plan not found' 
      });
    }
    
    // Check ownership
    if (travelPlan.userId.toString() !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'You can only delete your own travel plans' 
      });
    }
    
    await TravelPlan.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Travel plan deleted successfully!',
    });
  } catch (err) {
    console.error('Error deleting travel plan:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete travel plan' 
    });
  }
});

// ✅ POST Connect with Traveler (Premium Only)
router.post('/connect/:userId', auth, async (req, res) => {
  try {
    // Get current user
    const currentUser = await User.findById(req.user.userId);
    
    if (!currentUser) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    // Check if user is premium
    if (!currentUser.isPremium) {
      return res.status(403).json({ 
        success: false,
        isPremiumRequired: true,
        error: 'Only premium members can connect with travelers. Upgrade to unlock this feature!' 
      });
    }
    
    // Get target user
    const targetUser = await User.findById(req.params.userId);
    
    if (!targetUser) {
      return res.status(404).json({ 
        success: false,
        error: 'Traveler not found' 
      });
    }
    
    // Here you can add logic to:
    // 1. Create a chat/message
    // 2. Send notification
    // 3. Add to connections list
    // For now, we'll return success
    
    res.json({
      success: true,
      message: `Successfully connected with ${targetUser.name}! You can now start chatting.`,
      user: {
        id: targetUser._id,
        name: targetUser.name,
        photo: targetUser.profilePicture ? `api/user/profile/picture/${targetUser._id}` : null,
      },
    });
  } catch (err) {
    console.error('Error connecting with traveler:', err);
    res.status(500).json({ 
      success: false,
      error: 'Failed to connect with traveler' 
    });
  }
});

// ✅ GET Available Travel Interests
router.get('/interests', (req, res) => {
  const interests = [
    'Beaches',
    'Mountains',
    'Hiking',
    'Adventure',
    'Food & Cuisine',
    'Photography',
    'Culture & History',
    'Wildlife',
    'City Tours',
    'Shopping',
    'Nightlife',
    'Relaxation',
    'Water Sports',
    'Camping',
    'Road Trips',
  ];
  
  res.json({
    success: true,
    interests,
  });
});

module.exports = router;

