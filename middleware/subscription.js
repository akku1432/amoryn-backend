const Subscription = require('../models/Subscription');

const attachSubscription = async (req, res, next) => {
  try {
    // Find active subscription that hasn't expired
    const sub = await Subscription.findOne({
      userId: req.user._id,
      endDate: { $gte: new Date() }, // Subscription hasn't expired
    });

    // User is premium if they have a valid subscription
    req.user.isPremium = !!sub;
    req.user.subscriptionPlan = sub?.plan || null;
    req.user.subscription = sub || null;

    next();
  } catch (err) {
    console.error('Subscription middleware error:', err);
    // If there's an error, assume user is not premium
    req.user.isPremium = false;
    req.user.subscriptionPlan = null;
    req.user.subscription = null;
    next();
  }
};

module.exports = { attachSubscription };
