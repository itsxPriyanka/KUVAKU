const OpenAI = require('openai');

/**
 * AI Service for lead intent classification
 * Uses OpenAI GPT model to analyze lead fit
 */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Build prompt for AI classification
 */
function buildPrompt(lead, offer) {
  return `You are a B2B sales qualification expert. Analyze if this prospect is a good fit for our product.

PRODUCT/OFFER:
Name: ${offer.name}
Value Propositions: ${offer.value_props.join(', ')}
Ideal Use Cases: ${offer.ideal_use_cases.join(', ')}

PROSPECT:
Name: ${lead.name}
Role: ${lead.role}
Company: ${lead.company}
Industry: ${lead.industry}
Location: ${lead.location}
LinkedIn Bio: ${lead.linkedin_bio || 'Not provided'}

TASK:
Classify this prospect's buying intent as High, Medium, or Low.
Consider:
1. Does their role indicate decision-making power?
2. Does their industry match our ideal use cases?
3. Does their background suggest they would benefit from our product?

Respond in this exact format:
Intent: [High/Medium/Low]
Reasoning: [1-2 sentences explaining your classification]`;
}

/**
 * Parse AI response
 */
function parseAIResponse(response) {
  const lines = response.split('\n').map(line => line.trim());
  
  let intent = 'Medium';
  let reasoning = 'Unable to determine fit.';
  
  for (const line of lines) {
    if (line.toLowerCase().startsWith('intent:')) {
      const intentMatch = line.match(/intent:\s*(high|medium|low)/i);
      if (intentMatch) {
        intent = intentMatch[1].charAt(0).toUpperCase() + intentMatch[1].slice(1).toLowerCase();
      }
    } else if (line.toLowerCase().startsWith('reasoning:')) {
      reasoning = line.replace(/reasoning:\s*/i, '').trim();
    }
  }
  
  // If reasoning is in next line
  if (reasoning === 'Unable to determine fit.' || reasoning.length < 10) {
    const reasoningIndex = lines.findIndex(l => l.toLowerCase().startsWith('reasoning:'));
    if (reasoningIndex >= 0 && reasoningIndex + 1 < lines.length) {
      const nextLine = lines[reasoningIndex + 1];
      if (nextLine && nextLine.length > 10) {
        reasoning = nextLine;
      }
    }
  }
  
  return { intent, reasoning };
}

/**
 * Classify lead intent using OpenAI
 */
async function classifyIntent(lead, offer) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('No OpenAI API key found. Using fallback classification.');
      return fallbackClassification(lead, offer);
    }

    const prompt = buildPrompt(lead, offer);
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a B2B sales qualification expert. Provide concise, actionable analysis.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 150
    });

    const response = completion.choices[0].message.content;
    return parseAIResponse(response);
    
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    return fallbackClassification(lead, offer);
  }
}

/**
 * Fallback classification when AI is unavailable
 */
function fallbackClassification(lead, offer) {
  // Simple heuristic-based classification
  let score = 0;
  let reasons = [];
  
  // Check role
  const roleLower = (lead.role || '').toLowerCase();
  if (['ceo', 'cto', 'founder', 'vp', 'director', 'head'].some(k => roleLower.includes(k))) {
    score += 2;
    reasons.push('senior role');
  } else if (['manager', 'lead'].some(k => roleLower.includes(k))) {
    score += 1;
    reasons.push('management role');
  }
  
  // Check industry
  const industryLower = (lead.industry || '').toLowerCase();
  const hasIndustryMatch = offer.ideal_use_cases.some(uc => 
    industryLower.includes(uc.toLowerCase()) || uc.toLowerCase().includes(industryLower)
  );
  if (hasIndustryMatch) {
    score += 2;
    reasons.push('industry match');
  }
  
  // Determine intent
  let intent = 'Low';
  if (score >= 3) intent = 'High';
  else if (score >= 1) intent = 'Medium';
  
  const reasoning = reasons.length > 0 
    ? `Prospect shows ${reasons.join(' and ')} indicating potential fit.`
    : 'Limited signals for product fit based on available data.';
  
  return { intent, reasoning };
}

module.exports = {
  classifyIntent,
  buildPrompt,
  parseAIResponse
};