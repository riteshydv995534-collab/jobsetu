const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'jansetu-hackathon-techtrix-super-secure-key-2026';

const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // Check HTTP-only cookie first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in with authorized credentials.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id)
      .select('-password')
      .populate('assignedSchemes', 'schemeId name code benefitCategory');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid session or account deactivated.'
      });
    }

    if (user.approvalStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Account access has been suspended. Please contact platform administration.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session token. Please re-authenticate.'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access forbidden: Your role (${req.user.role}) lacks authorization to perform this operation. Required role(s): [${roles.join(', ')}].`
      });
    }

    next();
  };
};

/**
 * Scheme-Specific Authority Access Control:
 * Enforces that authority officers can ONLY view, review, or evaluate applications
 * and analytics for schemes explicitly in their assignedSchemes list.
 * Admins (SUPER_ADMIN, RECORDS_ADMIN) bypass this check.
 */
const enforceSchemeAccess = (paramKey = 'schemeId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Admins bypass scheme restrictions
    if (['SUPER_ADMIN', 'DEPARTMENT_ADMIN', 'RECORDS_ADMIN'].includes(req.user.role)) {
      return next();
    }

    // Applicants do not manage schemes, so they are not evaluated by officer scheme assignment
    if (req.user.role === 'APPLICANT') {
      return next();
    }

    // Extract target scheme ID from params, query, or body
    const targetSchemeId =
      req.params[paramKey] ||
      req.query[paramKey] ||
      req.body[paramKey] ||
      req.params.scheme ||
      req.query.scheme ||
      req.body.scheme;

    // If no specific scheme is targeted, let the controller handle array filtering
    if (!targetSchemeId || targetSchemeId === 'ALL') {
      return next();
    }

    const assignedIds = (req.user.assignedSchemes || []).map((s) =>
      typeof s === 'object' && s._id ? s._id.toString() : s.toString()
    );

    const isAuthorized = assignedIds.some(
      (id) => id === targetSchemeId.toString()
    );

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You are not authorized to view, review, or manage records for this scheme. Only officers specifically assigned to this scheme may access it.'
      });
    }

    next();
  };
};

/**
 * Strict Applicant Isolation:
 * Applicants can only view or manage their own records.
 */
const enforceApplicantIsolation = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  // Only APPLICANT role is subjected to isolation constraints
  if (req.user.role !== 'APPLICANT') {
    return next();
  }

  // If a specific applicantIndividualId is passed in body/query/params, it must match user's linkedIndividual
  const requestedIndividual =
    req.params.applicantId ||
    req.query.applicantId ||
    req.body.applicantIndividualId ||
    req.body.applicantIndividual;

  if (requestedIndividual && req.user.linkedIndividual) {
    const userIndId = req.user.linkedIndividual._id
      ? req.user.linkedIndividual._id.toString()
      : req.user.linkedIndividual.toString();

    if (requestedIndividual.toString() !== userIndId) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden: You cannot access or submit applications for another citizen.'
      });
    }
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  enforceSchemeAccess,
  enforceApplicantIsolation,
  JWT_SECRET
};
