const express = require('express');
const router = express.Router();
const { getDatasets, uploadDataset, getDataset, deleteDataset, resetDatasetStatus } = require('../controllers/datasetController');
const { protect } = require('../middleware/auth');
const { validateDataset } = require('../middleware/validation');

// @route   GET /api/datasets
// @desc    Get all datasets for user
// @access  Private
router.get('/', protect, getDatasets);

// @route   POST /api/datasets
// @desc    Upload new dataset
// @access  Private
router.post('/', protect, validateDataset, uploadDataset);

// @route   GET /api/datasets/:id
// @desc    Get dataset by ID
// @access  Private
router.get('/:id', protect, getDataset);

// @route   POST /api/datasets/:id/reset
// @desc    Reset dataset status
// @access  Private
router.post('/:id/reset', protect, resetDatasetStatus);

// @route   DELETE /api/datasets/:id
// @desc    Delete dataset
// @access  Private
router.delete('/:id', protect, deleteDataset);

module.exports = router;
