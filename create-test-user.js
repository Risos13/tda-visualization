const mongoose = require('mongoose');
const User = require('./src/models/User');

const createTestUser = async () => {
  try {
    // Connect to MongoDB using Docker service name
    await mongoose.connect('mongodb://admin:password@mongodb:27017/xkfi-tda?authSource=admin', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'test@example.com' });
    
    if (existingUser) {
      console.log('Test user already exists:', existingUser);
      process.exit(0);
    }

    // Create test user
    const user = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test123!',
      role: 'user'
    });

    // Save user to database
    await user.save();
    console.log('Test user created successfully:', user);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
};

createTestUser();
