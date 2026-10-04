const fs = require('fs');
const path = require('path');
const Dataset = require('../models/Dataset');
const tdaService = require('../services/tdaService');

// Helper function to clean up temporary files
const cleanupTempFiles = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[TDA] Cleaned up temporary file: ${filePath}`);
    }
  } catch (error) {
    console.error(`[TDA] Error cleaning up file ${filePath}:`, error.message);
  }
};

// @desc    Compute TDA for dataset
// @route   POST /api/tda/compute
// @access  Private
exports.computeTDA = async (req, res) => {
  try {
    console.log('[TDA] Compute request received:', {
      body: req.body,
      user: req.user.id,
      timestamp: new Date().toISOString()
    });

    const { datasetId } = req.body;

    if (!datasetId) {
      console.error('[TDA] Error: Dataset ID is required');
      return res.status(400).json({ 
        success: false,
        error: 'Dataset ID is required' 
      });
    }

    // Find dataset and verify ownership
    const dataset = await Dataset.findOne({
      _id: datasetId,
      owner: req.user.id
    });

    if (!dataset) {
      console.error(`[TDA] Error: Dataset not found or access denied. Dataset ID: ${datasetId}, User: ${req.user.id}`);
      return res.status(404).json({ 
        success: false,
        error: 'Dataset not found or access denied' 
      });
    }

    console.log(`[TDA] Found dataset:`, {
      id: dataset._id,
      name: dataset.name,
      type: dataset.dataType,
      status: dataset.processingStatus,
      filePath: dataset.filePath,
      fileExists: fs.existsSync(dataset.filePath)
    });

    // Check if already processing or processed
    if (dataset.processingStatus === 'processing') {
      // If stuck in processing for too long, allow reprocessing
      const processingTime = new Date() - new Date(dataset.updatedAt);
      if (processingTime < 5 * 60 * 1000) { // 5 minutes
        console.log(`[TDA] Dataset ${datasetId} is already being processed`);
        return res.status(400).json({ 
          success: false,
          error: 'Dataset is already being processed' 
        });
      }
      // If stuck, allow reprocessing
      console.log(`[TDA] Dataset ${datasetId} appears stuck in processing, allowing retry`);
    }

    // Update status to processing
    dataset.processingStatus = 'processing';
    await dataset.save();

    let tempFilePath = null;
    try {
      console.log(`[TDA] Starting TDA computation for dataset ${dataset._id}`);
      console.log(`[TDA] File path: ${dataset.filePath}`);
      
      // Create a copy of the file for processing to avoid file handle issues
      const fileExt = path.extname(dataset.filePath);
      tempFilePath = path.join(path.dirname(dataset.filePath), `temp_${Date.now()}${fileExt}`);
      fs.copyFileSync(dataset.filePath, tempFilePath);
      
      // Parse dataset file
      const points = await tdaService.parseDataset(tempFilePath);
      console.log(`[TDA] Parsed ${points.length} points from dataset`);
      
      if (!points || points.length === 0) {
        throw new Error('No valid points found in dataset');
      }
      
      // Update dataset with point information
      dataset.pointCount = points.length;
      dataset.dimensions = points[0]?.length || 0;
      console.log(`[TDA] Dataset has ${points.length} points with ${dataset.dimensions} dimensions`);
      
      // Validate points
      if (dataset.dimensions < 2) {
        throw new Error(`Invalid point dimensions: ${dataset.dimensions}. At least 2 dimensions are required.`);
      }
      
      // Compute TDA
      console.log('[TDA] Starting persistent homology computation...');
      const tdaResults = await tdaService.computePersistentHomology(points);
      console.log('[TDA] Successfully computed TDA results');
      
      // Save results to dataset
      dataset.tdaResults = tdaResults;
      dataset.processingStatus = 'processed';
      dataset.metadata = dataset.metadata || {};
      dataset.metadata.processedAt = new Date();
      
      await dataset.save();
      console.log(`[TDA] Successfully saved results for dataset ${dataset._id}`);

      // Clean up temp file
      cleanupTempFiles(tempFilePath);
      
      return res.status(200).json({
        success: true,
        message: 'TDA computation completed successfully',
        data: {
          datasetId: dataset._id,
          status: 'processed',
          results: tdaResults
        }
      });

    } catch (computationError) {
      // Clean up temp file in case of error
      cleanupTempFiles(tempFilePath);
      
      // Update status to error
      const errorMessage = computationError.message || 'Unknown error during TDA computation';
      console.error(`[TDA] Computation error: ${errorMessage}`, {
        stack: computationError.stack,
        datasetId: dataset._id,
        filePath: dataset.filePath,
        datasetType: dataset.dataType
      });
      
      try {
        dataset.processingStatus = 'error';
        dataset.metadata = dataset.metadata || {};
        dataset.metadata.lastError = {
          message: errorMessage,
          timestamp: new Date(),
          stack: process.env.NODE_ENV === 'development' ? computationError.stack : undefined
        };
        
        await dataset.save();
      } catch (saveError) {
        console.error('[TDA] Failed to save error state:', saveError);
      }
      
      return res.status(500).json({ 
        success: false,
        error: 'TDA computation failed',
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    } finally {
      // Ensure temp file is cleaned up
      cleanupTempFiles(tempFilePath);
    }

  } catch (error) {
    console.error('Compute TDA error:', error);
    res.status(500).json({ error: 'Server error during TDA computation' });
  }
};

// @desc    Get TDA computation results
// @route   GET /api/tda/results/:id
// @access  Private
exports.getTDAResults = async (req, res) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).select('tdaResults processingStatus name');

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    if (dataset.processingStatus !== 'processed') {
      return res.status(400).json({ 
        error: 'TDA results not available',
        status: dataset.processingStatus
      });
    }

    res.status(200).json({
      success: true,
      data: {
        datasetId: dataset._id,
        datasetName: dataset.name,
        results: dataset.tdaResults
      }
    });

  } catch (error) {
    console.error('Get TDA results error:', error);
    res.status(500).json({ error: 'Server error retrieving TDA results' });
  }
};

// @desc    Get computation status
// @route   GET /api/tda/status/:id
// @access  Private
exports.getTDAStatus = async (req, res) => {
  try {
    const dataset = await Dataset.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).select('processingStatus pointCount dimensions metadata.processedAt');

    if (!dataset) {
      return res.status(404).json({ error: 'Dataset not found' });
    }

    let progress = 0;
    switch (dataset.processingStatus) {
      case 'uploaded':
        progress = 0;
        break;
      case 'processing':
        progress = 50;
        break;
      case 'processed':
        progress = 100;
        break;
      case 'error':
        progress = -1;
        break;
    }

    res.status(200).json({
      success: true,
      data: {
        datasetId: dataset._id,
        status: dataset.processingStatus,
        progress: progress,
        pointCount: dataset.pointCount,
        dimensions: dataset.dimensions,
        processedAt: dataset.metadata.processedAt
      }
    });

  } catch (error) {
    console.error('Get TDA status error:', error);
    res.status(500).json({ error: 'Server error retrieving TDA status' });
  }
};
