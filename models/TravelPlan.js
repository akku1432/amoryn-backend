const mongoose = require('mongoose');

const travelPlanSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  destination: {
    type: String,
    required: true,
    trim: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  budget: {
    type: String,
    enum: ['Budget-friendly', 'Moderate', 'Luxury', 'Flexible'],
    default: 'Flexible',
  },
  interests: {
    type: [String],
    validate: {
      validator: function(arr) {
        return arr.length <= 5;
      },
      message: 'You can select up to 5 interests only',
    },
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
travelPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Ensure end date is after start date
travelPlanSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

module.exports = mongoose.model('TravelPlan', travelPlanSchema);

