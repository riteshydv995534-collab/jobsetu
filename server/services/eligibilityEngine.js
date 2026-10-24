const { assessSchemeEligibility, CURRENT_RULE_VERSION } = require('./verification/schemeVerificationEngine');

/**
 * JanSetu Eligibility Assessment Engine (Bridge)
 * Delegates to the unified Government Scheme Eligibility & Verification Engine.
 */
const assessEligibility = async ({
  scheme,
  applicant,
  household,
  property,
  excludeApplicationId = null
}) => {
  return assessSchemeEligibility({
    scheme,
    applicant,
    household,
    property,
    excludeApplicationId
  });
};

module.exports = {
  assessEligibility,
  assessSchemeEligibility,
  CURRENT_RULE_VERSION
};
