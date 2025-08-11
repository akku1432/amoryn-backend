const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Subscription = require("../models/Subscription");
const auth = require("../middleware/auth");
const upload = require("../middleware/upload");
const { attachSubscription } = require("../middleware/subscription");

// Initialize GridFS
let gfsBucket;
mongoose.connection.once("open", () => {
  gfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: "profilePictures",
  });
});

// Helpers
const normalizeHobbies = (hobbies) => {
  if (Array.isArray(hobbies)) return hobbies;
  if (typeof hobbies === "string") {
    const trimmed = hobbies.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      // If a single string is provided, treat it as a one-item array
      return [trimmed];
    }
  }
  return [];
};

const normalizeString = (value) =>
  typeof value === "string" ? value : value ? String(value) : "";

// ✅ GET /profile
router.get("/profile", auth, attachSubscription, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      ...user.toObject(),
      isPremium: req.user.isPremium,
      plan: req.user.subscriptionPlan,
      subscription: req.user.subscription,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// ✅ PUT /profile (update text details only)
router.put("/profile", auth, attachSubscription, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const {
      hobbies,
      smoking,
      drinking,
      relationshipType,
      bio,
      country,
      state,
      city,
    } = req.body;

    user.hobbies = normalizeHobbies(hobbies);
    user.smoking = normalizeString(smoking);
    user.drinking = normalizeString(drinking);
    user.relationshipType = normalizeString(relationshipType);
    user.bio = normalizeString(bio);
    user.country = normalizeString(country);
    user.state = normalizeString(state);
    user.city = normalizeString(city);

    await user.save();
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("PUT /profile error:", err);
    res.status(500).json({ error: "Profile update failed" });
  }
});

// ✅ POST /profile/picture - upload/replace single profile picture
router.post(
  "/profile/picture",
  auth,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file)
        return res.status(400).json({ error: "No image uploaded" });
      if (!gfsBucket)
        return res
          .status(500)
          .json({ error: "Image storage not initialized" });

      const user = await User.findById(req.user._id);

      // Remove old picture if exists
      if (user.profilePicture) {
        try {
          await gfsBucket.delete(
            new mongoose.Types.ObjectId(user.profilePicture)
          );
        } catch (err) {
          console.warn("Old profile picture delete error:", err.message);
        }
      }

      // Upload new picture to GridFS
      const uploadStream = gfsBucket.openUploadStream(
        req.file.originalname,
        {
          contentType: req.file.mimetype,
        }
      );
      uploadStream.end(req.file.buffer);

      uploadStream.on("finish", async (file) => {
        user.profilePicture = file._id;
        await user.save();
        res.json({ message: "Profile picture updated", fileId: file._id });
      });

      uploadStream.on("error", (err) => {
        console.error("GridFS upload error:", err);
        res.status(500).json({ error: "Image upload failed" });
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Profile picture upload failed" });
    }
  }
);

// ✅ GET /profile/picture/:userId - fetch single profile picture
router.get("/profile/picture/:userId", async (req, res) => {
  try {
    if (!gfsBucket)
      return res
        .status(500)
        .json({ error: "Image storage not initialized" });

    const user = await User.findById(req.params.userId);
    if (!user || !user.profilePicture)
      return res.status(404).json({ error: "Profile picture not found" });

    const fileId = new mongoose.Types.ObjectId(user.profilePicture);
    const downloadStream = gfsBucket.openDownloadStream(fileId);

    downloadStream.on("error", (err) => {
      console.error("GridFS download error:", err);
      res.status(404).json({ error: "Image not found" });
    });

    downloadStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile picture" });
  }
});

// Convenience: GET /profile/picture/me - current user's picture
router.get("/profile/picture/me", auth, async (req, res) => {
  try {
    if (!gfsBucket)
      return res
        .status(500)
        .json({ error: "Image storage not initialized" });

    const user = await User.findById(req.user._id);
    if (!user || !user.profilePicture)
      return res.status(404).json({ error: "Profile picture not found" });

    const fileId = new mongoose.Types.ObjectId(user.profilePicture);
    const downloadStream = gfsBucket.openDownloadStream(fileId);

    downloadStream.on("error", (err) => {
      console.error("GridFS download error:", err);
      res.status(404).json({ error: "Image not found" });
    });

    downloadStream.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch profile picture" });
  }
});

// ✅ DELETE /delete - delete current user and picture (matches frontend)
router.delete("/delete", auth, async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Delete associated GridFS profile picture if exists
    if (user.profilePicture && gfsBucket) {
      try {
        await gfsBucket.delete(
          new mongoose.Types.ObjectId(user.profilePicture)
        );
      } catch (err) {
        console.error("Error deleting GridFS file:", err.message);
      }
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: "Account and profile picture deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ GET Match Suggestions
router.get("/match", auth, attachSubscription, async (req, res) => {
  try {
    const genderMatch =
      req.user.lookingFor === "both" ? ["male", "female"] : [req.user.lookingFor];

    const excludeIds = [
      req.user._id,
      ...(req.user.likes || []),
      ...(req.user.dislikes || []),
    ];

    const matchedUsers = await User.find({
      _id: { $nin: excludeIds },
      gender: { $in: genderMatch },
    }).select("-password");

    res.json({
      users: matchedUsers,
      isPremium: req.user.isPremium,
      plan: req.user.subscriptionPlan,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// ✅ POST Like / Dislike
router.post("/match/action", auth, attachSubscription, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const { targetUserId, action } = req.body;

    if (!["like", "dislike"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    if (targetUserId === currentUser._id.toString()) {
      return res.status(400).json({ error: "Cannot act on yourself" });
    }

    if (
      (action === "like" && currentUser.likes.includes(targetUserId)) ||
      (action === "dislike" && currentUser.dislikes.includes(targetUserId))
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
      if (action === "like" && currentUser.dailyLikeCount >= 10) {
        return res.status(403).json({
          error: "Daily like limit reached. Upgrade to premium to continue.",
        });
      }
    }

    if (action === "like") {
      currentUser.likes.push(targetUserId);
      if (!req.user.isPremium) currentUser.dailyLikeCount++;
    } else {
      currentUser.dislikes.push(targetUserId);
    }

    await currentUser.save();

    if (action === "like") {
      const io = req.app.get("io");
      const userSocketMap = global.userSocketMap;
      const recipientSocketId = userSocketMap.get(targetUserId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("new-like", {
          from: req.user._id.toString(),
          message: `${req.user.name || "Someone"} liked your profile.`,
        });
      }
    }

    res.json({ success: true, message: `User ${action}d` });
  } catch (err) {
    res.status(500).json({ error: "Failed to process action" });
  }
});

// ✅ GET Friends (Mutual Likes)
router.get("/friends", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).lean();
    const iLiked = currentUser.likes.map((id) => id.toString());

    const usersWhoLikedMe = await User.find({ likes: req.user._id }).select(
      "-password"
    );
    const mutualFriends = usersWhoLikedMe.filter((u) =>
      iLiked.includes(u._id.toString())
    );

    res.json(mutualFriends);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch friends" });
  }
});

// ✅ GET Requests
router.get("/requests", auth, attachSubscription, async (req, res) => {
  try {
    const usersWhoLikedMe = await User.find({ likes: req.user._id }).select(
      "-password"
    );
    const pending = usersWhoLikedMe.filter(
      (u) => !req.user.likes.includes(u._id.toString())
    );

    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// ✅ POST /subscribe (create or update subscription)
router.post("/subscribe", auth, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!["monthly", "yearly"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan selected" });
    }

    if (!req.user?._id) {
      return res.status(400).json({ error: "User ID missing from token" });
    }
    console.log("Subscribe request userId:", req.user._id);

    const duration = plan === "monthly" ? 30 : 365;
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

    res.json({ message: "Subscription activated", subscription });
  } catch (err) {
    console.error("Subscription activation error:", err);
    console.error(err.stack);
    res.status(500).json({ error: "Failed to activate subscription" });
  }
});

// ✅ GET /subscribe - current active subscription
router.get("/subscribe", auth, async (req, res) => {
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
    res.status(500).json({ error: "Failed to fetch subscription" });
  }
});

module.exports = router;