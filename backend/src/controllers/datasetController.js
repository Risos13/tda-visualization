const Dataset = require('../models/Dataset');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/datasets';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept CSV, JSON, TXT, and image files
  const allowedTypes = [
    'text/csv',
    'text/plain',
    'application/json',
    'application/vnd.ms-excel', // CSV files on Windows
    'application/octet-stream', // Generic binary (sometimes used for CSV/JSON)
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/svg+xml'
  ];
  
  // Also check file extension as a fallback
  const allowedExtensions = ['.csv', '.json', '.txt', '.png', '.jpg', '.jpeg', '.svg'];
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  console.log(`File upload attempt - Name: ${file.originalname}, MIME: ${file.mimetype}, Extension: ${fileExt}`);
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
    cb(null, true);
  } else {
    console.error(`File rejected - MIME: ${file.mimetype}, Extension: ${fileExt}`);
    cb(new Error('Invalid file type. Only CSV, JSON, TXT, PNG, JPG/JPEG, and SVG files are allowed.'), false);
  }
};

// File size limits in bytes (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// @desc    Get all datasets for user
// @route   GET /api/datasets
// @access  Private
exports.getDatasets = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    const datasets = await Dataset.find({ owner: req.user.id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex)
      .select('-filePath'); // Don't expose file system paths

    const total = await Dataset.countDocuments({ owner: req.user.id });

    // Transform datasets to use 'id' instead of '_id'
    const transformedDatasets = datasets.map(dataset => ({
      id: dataset._id,
      name: dataset.name,
      description: dataset.description,
      owner: dataset.owner,
      filename: dataset.filename,
      originalName: dataset.originalName,
      fileSize: dataset.fileSize,
      mimeType: dataset.mimeType,
      dataType: dataset.dataType,
      processingStatus: dataset.processingStatus,
      pointCount: dataset.pointCount,
      dimensions: dataset.dimensions,
      tdaResults: dataset.tdaResults,
      metadata: dataset.metadata,
      createdAt: dataset.createdAt,
      updatedAt: dataset.updatedAt
    }));

    res.status(200).json({
      success: true,
      count: transformedDatasets.length,
      total,
      pagination: {
        page,
        limit,
        pages: Math.ceil(total / limit)
      },
      data: transformedDatasets
    });
  } catch (error) {
    console.error('Get datasets error:', error);
    res.status(500).json({ error: 'Server error retrieving datasets' });
  }
};

// @desc    Upload new dataset
// @route   POST /api/datasets
// @access  Private
exports.uploadDataset = [
  upload.single('dataset'),
  async (req, res) => {
    try {
      console.log('Upload request received');
      console.log('Body:', req.body);
      console.log('File:', req.file);
      
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.error('Validation errors:', errors.array());
        return res.status(400).json({ 
          error: 'Validation failed',
          details: errors.array()
        });
      }

      if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ 
          success: false,
          error: 'Please upload a file' 
        });
      }

      // Additional file size check (in case multer's limit is bypassed)
      if (req.file.size > MAX_FILE_SIZE) {
        console.error(`File too large: ${req.file.size} bytes`);
        // Clean up the uploaded file
        fs.unlinkSync(req.file.path);
        return res.status(400).json({
          success: false,
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        });
      }

      const { name, description, dataType } = req.body;

      // Create dataset record
      const dataset = await Dataset.create({
        name: name || req.file.originalname,
        description,
        owner: req.user.id,
        filename: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        dataType: dataType || 'point_cloud'
      });

      // Add dataset to user's datasets array
      await User.findByIdAndUpdate(req.user.id, {
        $push: { datasets: dataset._id }
      });

      res.status(201).json({
        success: true,
        data: {
          id: dataset._id,
          name: dataset.name,
          description: dataset.description,
          originalName: dataset.originalName,
          fileSize: dataset.fileSize,
          dataType: dataset.dataType,
          processingStatus: dataset.processingStatus,
          uploadedAt: dataset.metadata.uploadedAt
        }
      });
    } catch (error) {
      console.error('Upload dataset error:', error);
      res.status(500).json({ error: 'Server error uploading dataset' });
    }
  }
];

// @desc    Get single dataset
// @route   GET /api/datasets/:id
// @access  Private
exports.getDataset = async (req, res) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).select('-filePath');

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    res.status(200).json({
      success: true,
      data: dataset
    });
  } catch (error) {
    console.error('Get dataset error:', error);
    res.status(500).json({ error: 'Server error retrieving dataset' });
  }
};

// @desc    Reset dataset status
// @route   POST /api/datasets/:id/reset
// @access  Private
exports.resetDatasetStatus = async (req, res) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    // Reset status to uploaded
    dataset.processingStatus = 'uploaded';
    dataset.tdaResults = undefined;
    await dataset.save();

    res.status(200).json({
      success: true,
      message: 'Dataset status reset successfully'
    });
  } catch (error) {
    console.error('Reset dataset status error:', error);
    res.status(500).json({ error: 'Server error resetting dataset status' });
  }
};

// @desc    Delete dataset
// @route   DELETE /api/datasets/:id
// @access  Private
exports.deleteDataset = async (req, res) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      owner: req.user.id
    });

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    // Remove from user's datasets array
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { datasets: dataset._id }
    });

    // Delete the dataset
    await Dataset.findByIdAndDelete(dataset._id);

    res.status(200).json({
      success: true,
      message: 'Dataset deleted successfully'
    });
  } catch (error) {
    console.error('Delete dataset error:', error);
    res.status(500).json({ error: 'Server error deleting dataset' });
  }
};
