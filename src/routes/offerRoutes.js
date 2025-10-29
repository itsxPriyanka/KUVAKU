const express = require('express');
const router = express.Router();
const storage = require('../storage/storage');
const { validateOffer } = require('../validators/validators');

/**
 * POST /api/offer
 * Accept and store product/offer information
 */
router.post('/offer', (req, res, next) => {
  try {
    const { name, value_props, ideal_use_cases } = req.body;

    // Validate input
    const validation = validateOffer(req.body);
    if (!validation.valid) {
      return res.status(400).json({ 
        error: { 
          message: 'Invalid offer data', 
          details: validation.errors 
        } 
      });
    }

    // Store offer
    const offer = storage.setOffer({
      name,
      value_props,
      ideal_use_cases
    });

    res.status(201).json({
      message: 'Offer created successfully',
      data: offer
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/offer
 * Retrieve current offer
 */
router.get('/offer', (req, res, next) => {
  try {
    const offer = storage.getOffer();
    
    if (!offer) {
      return res.status(404).json({ 
        error: { message: 'No offer found. Please create an offer first.' } 
      });
    }

    res.json({
      data: offer
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;