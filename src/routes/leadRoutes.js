const express = require('express');
const router = express.Router();
const multer = require('multer');
const csvParser = require('csv-parser');
const { Readable } = require('stream');
const storage = require('../storage/storage');
const { validateLead } = require('../validators/validators');

// Configure multer for CSV upload
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * POST /api/leads/upload
 * Upload and parse CSV file with lead data
 */
router.post('/leads/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        error: { message: 'No file uploaded. Please upload a CSV file.' } 
      });
    }

    const leads = [];
    const errors = [];

    // Parse CSV
    const stream = Readable.from(req.file.buffer.toString());
    
    await new Promise((resolve, reject) => {
      stream
        .pipe(csvParser({
          mapHeaders: ({ header }) => header.trim().toLowerCase()
        }))
        .on('data', (row) => {
          // Trim all values
          const trimmedRow = {};
          Object.keys(row).forEach(key => {
            trimmedRow[key] = row[key] ? row[key].trim() : '';
          });

          // Validate row
          const validation = validateLead(trimmedRow);
          if (validation.valid) {
            leads.push(trimmedRow);
          } else {
            errors.push({
              row: trimmedRow,
              errors: validation.errors
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (leads.length === 0) {
      return res.status(400).json({
        error: { 
          message: 'No valid leads found in CSV',
          details: errors
        }
      });
    }

    // Store leads
    storage.setLeads(leads);

    res.status(201).json({
      message: 'Leads uploaded successfully',
      data: {
        total_uploaded: leads.length,
        total_errors: errors.length,
        leads: leads,
        ...(errors.length > 0 && { validation_errors: errors })
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/leads
 * Retrieve uploaded leads
 */
router.get('/leads', (req, res, next) => {
  try {
    const leads = storage.getLeads();
    
    if (leads.length === 0) {
      return res.status(404).json({ 
        error: { message: 'No leads found. Please upload leads first.' } 
      });
    }

    res.json({
      data: {
        total: leads.length,
        leads: leads
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;