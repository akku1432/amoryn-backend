const mongoose = require('mongoose');
const User = require('./models/User');

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/amoryn', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected for migration');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Migration function
const migrateRelationshipType = async () => {
  try {
    console.log('Starting relationshipType migration...');
    
    // Find all users with string relationshipType
    const users = await User.find({
      relationshipType: { $exists: true, $type: 'string' }
    });
    
    console.log(`Found ${users.length} users with string relationshipType`);
    
    let updatedCount = 0;
    
    for (const user of users) {
      if (typeof user.relationshipType === 'string' && user.relationshipType.trim()) {
        // Convert string to array
        const newRelationshipType = [user.relationshipType.trim()];
        
        await User.updateOne(
          { _id: user._id },
          { $set: { relationshipType: newRelationshipType } }
        );
        
        updatedCount++;
        console.log(`Updated user ${user.email}: "${user.relationshipType}" -> [${newRelationshipType.join(', ')}]`);
      } else if (typeof user.relationshipType === 'string' && !user.relationshipType.trim()) {
        // Convert empty string to empty array
        await User.updateOne(
          { _id: user._id },
          { $set: { relationshipType: [] } }
        );
        
        updatedCount++;
        console.log(`Updated user ${user.email}: empty string -> []`);
      }
    }
    
    console.log(`Migration completed! Updated ${updatedCount} users.`);
    
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  connectDB().then(() => {
    migrateRelationshipType();
  });
}

module.exports = { migrateRelationshipType };
