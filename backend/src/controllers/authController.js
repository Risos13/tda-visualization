const User = require('../models/User');
const { validationResult } = require('express-validator');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    // Create token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    // Mongoose validation error
    if (error.name === 'ValidationError') {
      console.warn('Registration validation error:', error);
      return res.status(400).json({
        error: 'Validation failed',
        details: Object.values(error.errors || {}).map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }
    // Duplicate key (e.g., email already exists)
    if (error.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  console.log('[Auth] Login request received:', {
    body: req.body,
    headers: req.headers,
    method: req.method,
    url: req.originalUrl
  });

  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[Auth] Validation errors:', errors.array());
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, password } = req.body;
    console.log(`[Auth] Attempting login for email: ${email}`);

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log(`[Auth] No user found with email: ${email}`);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Check if password matches
    console.log(`[Auth] User found, checking password for: ${user._id}`);
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log(`[Auth] Invalid password for user: ${user._id}`);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Update last login
    console.log(`[Auth] Password matched, updating last login for: ${user._id}`);
    user.lastLogin = new Date();
    await user.save();

    // Create token
    const token = user.getSignedJwtToken();
    console.log(`[Auth] Token generated for user: ${user._id}`);

    // Prepare response
    const responseData = {
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    };

    console.log('[Auth] Login successful, sending response:', JSON.stringify(responseData, null, 2));
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Send response
    res.status(200).json(responseData);
  } catch (error) {
    console.error('[Auth] Login error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        error: 'Validation failed',
        details: error.message 
      });
    }
    res.status(500).json({ 
      success: false,
      error: 'Server error during login',
      details: error.message 
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('datasets');
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        datasets: user.datasets,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error retrieving user data' });
  }
};

// @desc    Logout user / clear token
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'User logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error during logout' });
  }
};
