const Subscription = require('../models/Subscription');
const User = require('../models/User');

const attachSubscription = async (req, res, next) => {
  try {
    // First, get the user's current status including referral premium
    const user = await User.findById(req.user._id);
    
    // Check if user has active referral premium (24-hour free premium)
    const hasActiveReferralPremium = user.isReferralPremium && 
                                   user.referralPremiumExpiry && 
                                   new Date(user.referralPremiumExpiry) > new Date();
    
    // Find active paid subscription that hasn't expired
    const sub = await Subscription.findOne({
      userId: req.user._id,
      endDate: { $gte: new Date() }, // Subscription hasn't expired
    });

    // User is premium if they have either:
    // 1. Active referral premium (24-hour free)
    // 2. Valid paid subscription
    req.user.isPremium = hasActiveReferralPremium || !!sub;
    req.user.subscriptionPlan = sub?.plan || null;
    req.user.subscription = sub || null;
    
    // Add referral premium info to req.user for frontend access
    req.user.isReferralPremium = user.isReferralPremium;
    req.user.referralPremiumExpiry = user.referralPremiumExpiry;

    next();
  } catch (err) {
    console.error('Subscription middleware error:', err);
    // If there's an error, assume user is not premium
    req.user.isPremium = false;
    req.user.subscriptionPlan = null;
    req.user.subscription = null;
    req.user.isReferralPremium = false;
    req.user.referralPremiumExpiry = null;
    next();
  }
};

module.exports = { attachSubscription };
