const aiService = require('./aiService');

/**
 * Rule-based scoring configuration
 */
const SCORING_RULES = {
  ROLE: {
    DECISION_MAKER: 20,
    INFLUENCER: 10,
    OTHER: 0
  },
  INDUSTRY: {
    EXACT_MATCH: 20,
    ADJACENT: 10,
    NO_MATCH: 0
  },
  DATA_COMPLETENESS: 10
};

const DECISION_MAKER_KEYWORDS = [
  'ceo', 'cto', 'cfo', 'coo', 'president', 'founder', 
  'owner', 'director', 'vp', 'vice president', 'head of', 
  'chief', 'principal', 'partner', 'managing'
];

const INFLUENCER_KEYWORDS = [
  'manager', 'lead', 'senior', 'sr.', 'coordinator',
  'specialist', 'supervisor', 'team lead'
];

/**
 * Calculate role-based score
 */
function scoreRole(role) {
  if (!role) return { score: SCORING_RULES.ROLE.OTHER, reason: 'No role provided' };
  
  const roleLower = role.toLowerCase();
  
  if (DECISION_MAKER_KEYWORDS.some(keyword => roleLower.includes(keyword))) {
    return { 
      score: SCORING_RULES.ROLE.DECISION_MAKER, 
      reason: 'Decision maker role' 
    };
  }
  
  if (INFLUENCER_KEYWORDS.some(keyword => roleLower.includes(keyword))) {
    return { 
      score: SCORING_RULES.ROLE.INFLUENCER, 
      reason: 'Influencer role' 
    };
  }
  
  return { 
    score: SCORING_RULES.ROLE.OTHER, 
    reason: 'Individual contributor role' 
  };
}

/**
 * Calculate industry match score
 */
function scoreIndustry(leadIndustry, idealUseCases) {
  if (!leadIndustry || !idealUseCases || idealUseCases.length === 0) {
    return { 
      score: SCORING_RULES.INDUSTRY.NO_MATCH, 
      reason: 'No industry match data' 
    };
  }

  const industryLower = leadIndustry.toLowerCase();
  
  // Check for exact matches
  for (const useCase of idealUseCases) {
    if (industryLower.includes(useCase.toLowerCase()) || 
        useCase.toLowerCase().includes(industryLower)) {
      return { 
        score: SCORING_RULES.INDUSTRY.EXACT_MATCH, 
        reason: 'Exact industry match with ICP' 
      };
    }
  }
  
  // Check for adjacent/related industries
  const adjacentKeywords = ['saas', 'software', 'tech', 'b2b', 'enterprise'];
  const hasAdjacent = adjacentKeywords.some(keyword => 
    industryLower.includes(keyword) || 
    idealUseCases.some(uc => uc.toLowerCase().includes(keyword))
  );
  
  if (hasAdjacent) {
    return { 
      score: SCORING_RULES.INDUSTRY.ADJACENT, 
      reason: 'Adjacent industry match' 
    };
  }
  
  return { 
    score: SCORING_RULES.INDUSTRY.NO_MATCH, 
    reason: 'No industry match' 
  };
}

/**
 * Calculate data completeness score
 */
function scoreDataCompleteness(lead) {
  const requiredFields = ['name', 'role', 'company', 'industry', 'location', 'linkedin_bio'];
  const hasAllFields = requiredFields.every(field => 
    lead[field] && lead[field].trim().length > 0
  );
  
  return {
    score: hasAllFields ? SCORING_RULES.DATA_COMPLETENESS : 0,
    reason: hasAllFields ? 'Complete data' : 'Incomplete data'
  };
}

/**
 * Calculate rule-based score (max 50 points)
 */
function calculateRuleScore(lead, offer) {
  const roleScore = scoreRole(lead.role);
  const industryScore = scoreIndustry(lead.industry, offer.ideal_use_cases);
  const completenessScore = scoreDataCompleteness(lead);
  
  const totalScore = roleScore.score + industryScore.score + completenessScore.score;
  
  return {
    score: totalScore,
    breakdown: {
      role: roleScore,
      industry: industryScore,
      completeness: completenessScore
    }
  };
}

/**
 * Map AI intent to score
 */
function mapIntentToScore(intent) {
  const intentLower = intent.toLowerCase();
  
  if (intentLower.includes('high')) return 50;
  if (intentLower.includes('medium')) return 30;
  if (intentLower.includes('low')) return 10;
  
  return 30; // Default to medium
}

/**
 * Determine final intent label from total score
 */
function determineIntent(totalScore) {
  if (totalScore >= 70) return 'High';
  if (totalScore >= 40) return 'Medium';
  return 'Low';
}

/**
 * Score a single lead
 */
async function scoreLead(lead, offer) {
  try {
    // Calculate rule-based score
    const ruleResult = calculateRuleScore(lead, offer);
    
    // Get AI-based score
    const aiResult = await aiService.classifyIntent(lead, offer);
    const aiScore = mapIntentToScore(aiResult.intent);
    
    // Calculate total score
    const totalScore = ruleResult.score + aiScore;
    const intent = determineIntent(totalScore);
    
    // Build reasoning
    const reasoning = [
      `Rule Score (${ruleResult.score}/50):`,
      `- ${ruleResult.breakdown.role.reason} (+${ruleResult.breakdown.role.score})`,
      `- ${ruleResult.breakdown.industry.reason} (+${ruleResult.breakdown.industry.score})`,
      `- ${ruleResult.breakdown.completeness.reason} (+${ruleResult.breakdown.completeness.score})`,
      `AI Analysis (${aiScore}/50): ${aiResult.reasoning}`
    ].join(' ');
    
    return {
      name: lead.name,
      role: lead.role,
      company: lead.company,
      industry: lead.industry,
      location: lead.location,
      intent: intent,
      score: totalScore,
      reasoning: reasoning,
      details: {
        rule_score: ruleResult.score,
        ai_score: aiScore,
        ai_intent: aiResult.intent
      }
    };
  } catch (error) {
    console.error(`Error scoring lead ${lead.name}:`, error);
    
    // Fallback to rule-based only if AI fails
    const ruleResult = calculateRuleScore(lead, offer);
    const intent = determineIntent(ruleResult.score);
    
    return {
      name: lead.name,
      role: lead.role,
      company: lead.company,
      industry: lead.industry,
      location: lead.location,
      intent: intent,
      score: ruleResult.score,
      reasoning: `Rule-based scoring only (AI unavailable). ${ruleResult.breakdown.role.reason}, ${ruleResult.breakdown.industry.reason}, ${ruleResult.breakdown.completeness.reason}.`,
      details: {
        rule_score: ruleResult.score,
        ai_score: 0,
        error: 'AI service unavailable'
      }
    };
  }
}

/**
 * Score all leads
 */
async function scoreAllLeads(leads, offer) {
  const scoredLeads = [];
  
  for (const lead of leads) {
    const scored = await scoreLead(lead, offer);
    scoredLeads.push(scored);
  }
  
  // Sort by score (highest first)
  scoredLeads.sort((a, b) => b.score - a.score);
  
  return scoredLeads;
}

module.exports = {
  scoreLead,
  scoreAllLeads,
  calculateRuleScore,
  determineIntent
};