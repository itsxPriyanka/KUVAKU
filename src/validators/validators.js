/**
 * Validation functions for API inputs
 */

/**
 * Validate offer data
 */
function validateOffer(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  }

  if (!data.value_props || !Array.isArray(data.value_props) || data.value_props.length === 0) {
    errors.push('value_props is required and must be a non-empty array');
  } else if (!data.value_props.every(vp => typeof vp === 'string' && vp.trim().length > 0)) {
    errors.push('all value_props must be non-empty strings');
  }

  if (!data.ideal_use_cases || !Array.isArray(data.ideal_use_cases) || data.ideal_use_cases.length === 0) {
    errors.push('ideal_use_cases is required and must be a non-empty array');
  } else if (!data.ideal_use_cases.every(uc => typeof uc === 'string' && uc.trim().length > 0)) {
    errors.push('all ideal_use_cases must be non-empty strings');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validate lead data from CSV
 */
function validateLead(data) {
  const errors = [];
  const requiredFields = ['name', 'role', 'company', 'industry', 'location'];

  requiredFields.forEach(field => {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim().length === 0) {
      errors.push(`${field} is required and must be a non-empty string`);
    }
  });

  // linkedin_bio is optional but should be string if present
  if (data.linkedin_bio && typeof data.linkedin_bio !== 'string') {
    errors.push('linkedin_bio must be a string if provided');
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

module.exports = {
  validateOffer,
  validateLead
};