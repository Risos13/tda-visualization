const express = require('express');
const router = express.Router();
const { computeTDA, getTDAResults, getTDAStatus } = require('../controllers/tdaController');
const { protect } = require('../middleware/auth');

// @route   POST /api/tda/compute
// @desc    Compute TDA for dataset
// @access  Private
router.post('/compute', protect, computeTDA);

// @route   GET /api/tda/results/:id
// @desc    Get TDA computation results
// @access  Private
router.get('/results/:id', protect, getTDAResults);

// @route   GET /api/tda/status/:id
// @desc    Get computation status
// @access  Private
router.get('/status/:id', protect, getTDAStatus);

module.exports = router;
