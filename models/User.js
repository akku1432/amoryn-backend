const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  plan: { type: String, enum: ['monthly', 'yearly'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  gender: String,
  dob: Date,
  lookingFor: String,
  password: String,
  country: String,
  state: String,
  city: String,
  hobbies: [String],
  smoking: String,
  drinking: String,
  relationshipType: String,
  bio: String,
  photos: [String], // keep for other user gallery images if needed
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },

  // 🔐 Premium support
  isPremium: { type: Boolean, default: false },
  subscription: subscriptionSchema,

  // 🔃 Daily Like Limit support
  dailyLikeCount: { type: Number, default: 0 },
  lastLikeDate: { type: Date, default: null },

  // 🖼 Profile Picture stored in GridFS
  profilePicture: { type: mongoose.Schema.Types.ObjectId, ref: 'ProfilePictures' }
});

module.exports = mongoose.model('User', userSchema);
