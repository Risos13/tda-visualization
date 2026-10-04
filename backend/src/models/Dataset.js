const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a dataset name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: [true, 'Filename is required']
  },
  originalName: {
    type: String,
    required: [true, 'Original filename is required']
  },
  filePath: {
    type: String,
    required: [true, 'File path is required']
  },
  fileSize: {
    type: Number,
    required: [true, 'File size is required']
  },
  mimeType: {
    type: String,
    required: [true, 'MIME type is required']
  },
  dataType: {
    type: String,
    enum: ['point_cloud', 'time_series', 'graph', 'image', 'other'],
    default: 'point_cloud'
  },
  dimensions: {
    type: Number,
    min: 1,
    max: 10
  },
  pointCount: {
    type: Number,
    min: 0
  },
  processingStatus: {
    type: String,
    enum: ['uploaded', 'processing', 'processed', 'error'],
    default: 'uploaded'
  },
  tdaResults: {
    persistenceDiagram: [{
      dimension: Number,
      birth: Number,
      death: Number,
      _id: false  // Disable automatic _id generation
    }],
    barcodes: [{
      dimension: Number,
      intervals: [[Number]],
      _id: false  // Disable automatic _id generation
    }],
    computedAt: Date
  },
  metadata: {
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    processedAt: Date,
    tags: [String],
    isPublic: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
datasetSchema.index({ owner: 1, createdAt: -1 });
datasetSchema.index({ name: 'text', description: 'text' });

// Virtual for file URL
datasetSchema.virtual('fileUrl').get(function() {
  return `/uploads/${this.filename}`;
});

// Clean up file when dataset is deleted
datasetSchema.pre('findOneAndDelete', async function(next) {
  const doc = await this.model.findOne(this.getQuery());
  if (doc) {
    const fs = require('fs');
    try {
      if (doc.filePath && fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
  next();
});

// Also handle findByIdAndDelete
datasetSchema.pre('findByIdAndDelete', async function(next) {
  const doc = await this.model.findOne(this.getQuery());
  if (doc) {
    const fs = require('fs');
    try {
      if (doc.filePath && fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
  next();
});

module.exports = mongoose.model('Dataset', datasetSchema);
