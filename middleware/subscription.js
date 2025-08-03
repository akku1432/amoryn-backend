const Subscription = require('../models/Subscription');

const attachSubscription = async (req, res, next) => {
  try {
    const sub = await Subscription.findOne({
      userId: req.user._id,
      isActive: true,
      endDate: { $gte: new Date() },
    });

    req.user.isPremium = !!sub;
    req.user.subscriptionPlan = sub?.plan || null;
    req.user.subscription = sub || null;

    next();
  } catch (err) {
    console.error('Subscription middleware error:', err);
    res.status(500).json({ error: 'Subscription check failed' });
  }
};

module.exports = { attachSubscription };
