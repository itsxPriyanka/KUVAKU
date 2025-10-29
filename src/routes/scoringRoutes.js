const express = require('express');
const router = express.Router();
const storage = require('../storage/storage');
const { scoreAllLeads } = require('../services/scoringService');

/**
 * POST /api/score
 * Run scoring pipeline on uploaded leads
 */
router.post('/score', async (req, res, next) => {
  try {
    // Check if offer exists
    const offer = storage.getOffer();
    if (!offer) {
      return res.status(400).json({
        error: { message: 'No offer found. Please create an offer first using POST /api/offer' }
      });
    }

    // Check if leads exist
    const leads = storage.getLeads();
    if (leads.length === 0) {
      return res.status(400).json({
        error: { message: 'No leads found. Please upload leads first using POST /api/leads/upload' }
      });
    }

    console.log(`Starting scoring for ${leads.length} leads...`);
    
    // Score all leads
    const scoredLeads = await scoreAllLeads(leads, offer);
    
    // Store scored results
    storage.setScoredLeads(scoredLeads);

    console.log('Scoring completed successfully');

    res.json({
      message: 'Leads scored successfully',
      data: {
        total_leads: scoredLeads.length,
        high_intent: scoredLeads.filter(l => l.intent === 'High').length,
        medium_intent: scoredLeads.filter(l => l.intent === 'Medium').length,
        low_intent: scoredLeads.filter(l => l.intent === 'Low').length,
        average_score: Math.round(scoredLeads.reduce((sum, l) => sum + l.score, 0) / scoredLeads.length)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/results
 * Retrieve scored leads
 */
router.get('/results', (req, res, next) => {
  try {
    const scoredLeads = storage.getScoredLeads();
    
    if (scoredLeads.length === 0) {
      return res.status(404).json({
        error: { message: 'No scored results found. Please run scoring first using POST /api/score' }
      });
    }

    // Optional: Filter by intent
    const { intent } = req.query;
    let filteredLeads = scoredLeads;
    
    if (intent) {
      const intentUpper = intent.charAt(0).toUpperCase() + intent.slice(1).toLowerCase();
      if (['High', 'Medium', 'Low'].includes(intentUpper)) {
        filteredLeads = scoredLeads.filter(l => l.intent === intentUpper);
      }
    }

    res.json({
      data: filteredLeads
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/results/export
 * Export results as CSV
 */
router.get('/results/export', (req, res, next) => {
  try {
    const scoredLeads = storage.getScoredLeads();
    
    if (scoredLeads.length === 0) {
      return res.status(404).json({
        error: { message: 'No scored results found. Please run scoring first using POST /api/score' }
      });
    }

    // Build CSV
    const headers = ['name', 'role', 'company', 'industry', 'location', 'intent', 'score', 'reasoning'];
    const csvRows = [headers.join(',')];
    
    scoredLeads.forEach(lead => {
      const row = [
        `"${lead.name}"`,
        `"${lead.role}"`,
        `"${lead.company}"`,
        `"${lead.industry}"`,
        `"${lead.location}"`,
        lead.intent,
        lead.score,
        `"${lead.reasoning.replace(/"/g, '""')}"` // Escape quotes
      ];
      csvRows.push(row.join(','));
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="scored_leads.csv"');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/results/summary
 * Get scoring summary statistics
 */
router.get('/results/summary', (req, res, next) => {
  try {
    const scoredLeads = storage.getScoredLeads();
    
    if (scoredLeads.length === 0) {
      return res.status(404).json({
        error: { message: 'No scored results found. Please run scoring first using POST /api/score' }
      });
    }

    const summary = {
      total_leads: scoredLeads.length,
      intent_distribution: {
        high: scoredLeads.filter(l => l.intent === 'High').length,
        medium: scoredLeads.filter(l => l.intent === 'Medium').length,
        low: scoredLeads.filter(l => l.intent === 'Low').length
      },
      score_statistics: {
        average: Math.round(scoredLeads.reduce((sum, l) => sum + l.score, 0) / scoredLeads.length),
        highest: Math.max(...scoredLeads.map(l => l.score)),
        lowest: Math.min(...scoredLeads.map(l => l.score))
      },
      top_leads: scoredLeads.slice(0, 5).map(l => ({
        name: l.name,
        company: l.company,
        score: l.score,
        intent: l.intent
      }))
    };

    res.json({ data: summary });
  } catch (error) {
    next(error);
  }
});

module.exports = router;