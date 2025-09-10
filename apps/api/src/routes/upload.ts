import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Error handler for multer
const handleMulterError = (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 25MB.' });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected file field.' });
    }
  }
  
  if (err.message === 'Only PDF files are allowed') {
    return res.status(400).json({ error: 'Only PDF files are allowed' });
  }
  
  return res.status(500).json({ error: 'File upload error', details: err.message });
};

// Create GridFS bucket using mongoose connection
const createBucket = () => {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database not connected');
  }
  
  return new mongoose.mongo.GridFSBucket(db, { bucketName: 'pdfs' });
};

router.post('/', upload.single('pdf'), handleMulterError, async (req: express.Request, res: express.Response) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ 
        error: 'No file uploaded',
        details: 'Please select a PDF file to upload'
      });
    }

    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ 
        error: 'Database error',
        details: 'Database not connected. Please try again later.'
      });
    }

    // Validate file buffer
    if (!req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid file',
        details: 'File appears to be empty or corrupted'
      });
    }

    // Create GridFS bucket
    const bucket = createBucket();

    // Create upload stream with metadata
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      metadata: {
        contentType: req.file.mimetype,
        uploadDate: new Date(),
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });

    // Handle upload completion
    const uploadPromise = new Promise<string>((resolve, reject) => {
      uploadStream.on('finish', () => {
        console.log('File uploaded successfully:', uploadStream.id.toString());
        resolve(uploadStream.id.toString());
      });

      uploadStream.on('error', (error) => {
        console.error('GridFS upload error:', error);
        reject(new Error(`Failed to upload file: ${error.message}`));
      });

      // Set timeout for upload
      const timeout = setTimeout(() => {
        uploadStream.destroy();
        reject(new Error('Upload timeout'));
      }, 60000); // 60 second timeout

      uploadStream.on('finish', () => clearTimeout(timeout));
      uploadStream.on('error', () => clearTimeout(timeout));
    });

    // Upload the file
    uploadStream.end(req.file.buffer);

    // Wait for upload to complete
    try {
      const fileId = await uploadPromise;
      
      res.status(201).json({
        success: true,
        fileId: fileId,
        fileName: req.file.originalname,
        message: 'File uploaded successfully',
        size: req.file.size,
        uploadedAt: new Date().toISOString()
      });
    } catch (uploadError) {
      console.error('Upload failed:', uploadError);
      res.status(500).json({ 
        error: 'Upload failed',
        details: uploadError instanceof Error ? uploadError.message : 'Unknown upload error'
      });
    }

  } catch (error) {
    console.error('Upload route error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown server error'
    });
  }
});

router.get('/:fileId', async (req: express.Request, res: express.Response) => {
  try {
    const { fileId } = req.params;
    
    // Check database connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ 
        error: 'Database error',
        details: 'Database not connected'
      });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ 
        error: 'Invalid file ID',
        details: 'File ID format is invalid'
      });
    }

    const bucket = createBucket();
    
    // Check if file exists before attempting download
    try {
      const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
      if (files.length === 0) {
        return res.status(404).json({ 
          error: 'File not found',
          details: 'The requested file does not exist'
        });
      }
    } catch (findError) {
      console.error('File lookup error:', findError);
      return res.status(500).json({ 
        error: 'Database error',
        details: 'Failed to lookup file'
      });
    }

    // Create download stream
    const downloadStream = bucket.openDownloadStream(new mongoose.Types.ObjectId(fileId));

    // Set response headers
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, max-age=3600', // Cache for 1 hour
    });

    // Handle download events
    downloadStream.on('error', (error) => {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(404).json({ 
          error: 'File not found',
          details: 'The requested file could not be retrieved'
        });
      }
    });

    downloadStream.on('end', () => {
      console.log('File download completed for fileId:', fileId);
    });

    // Set timeout for download
    const timeout = setTimeout(() => {
      downloadStream.destroy();
      if (!res.headersSent) {
        res.status(408).json({ 
          error: 'Download timeout',
          details: 'File download took too long'
        });
      }
    }, 30000); // 30 second timeout

    downloadStream.on('end', () => clearTimeout(timeout));
    downloadStream.on('error', () => clearTimeout(timeout));

    // Pipe the file to response
    downloadStream.pipe(res);

  } catch (error) {
    console.error('Download route error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown server error'
      });
    }
  }
});

// Add endpoint to get file metadata
router.get('/:fileId/info', async (req: express.Request, res: express.Response) => {
  try {
    const { fileId } = req.params;
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ 
        error: 'Database not connected'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ 
        error: 'Invalid file ID format'
      });
    }

    const bucket = createBucket();
    
    const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    
    if (files.length === 0) {
      return res.status(404).json({ 
        error: 'File not found'
      });
    }

    const file = files[0];
    
    res.json({
      success: true,
      data: {
        id: file._id.toString(),
        filename: file.filename,
        contentType: file.metadata?.contentType,
        size: file.length,
        uploadDate: file.uploadDate,
        metadata: file.metadata
      }
    });

  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ 
      error: 'Failed to get file info',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Add endpoint to delete file
router.delete('/:fileId', async (req: express.Request, res: express.Response) => {
  try {
    const { fileId } = req.params;
    
    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ 
        error: 'Database not connected'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ 
        error: 'Invalid file ID format'
      });
    }

    const bucket = createBucket();
    
    // Check if file exists
    const files = await bucket.find({ _id: new mongoose.Types.ObjectId(fileId) }).toArray();
    
    if (files.length === 0) {
      return res.status(404).json({ 
        error: 'File not found'
      });
    }

    // Delete the file
    await bucket.delete(new mongoose.Types.ObjectId(fileId));
    
    res.json({
      success: true,
      message: 'File deleted successfully',
      deletedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;