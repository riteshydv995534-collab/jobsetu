const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Individual = require('../models/Individual');
const Scheme = require('../models/Scheme');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { logAudit } = require('../services/auditService');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      assignedSchemes: user.assignedSchemes || [],
      linkedIndividual: user.linkedIndividual || null
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const register = async (req, res, next) => {
  try {
    const { name, email, password, role, demoIdentifier, district } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Role safety: Ordinary registration strictly produces APPLICANT
    // Authority roles cannot be self-assigned
    let assignedRole = 'APPLICANT';
    if (req.user && ['SUPER_ADMIN', 'RECORDS_ADMIN'].includes(req.user.role) && role) {
      assignedRole = role;
    }

    let linkedIndividual = null;
    if (demoIdentifier) {
      const ind = await Individual.findOne({ demoIdentifier: demoIdentifier.trim().toUpperCase() });
      if (ind) {
        linkedIndividual = ind._id;
      }
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: assignedRole,
      linkedIndividual,
      assignedDistrict: district || 'All',
      approvalStatus: 'APPROVED',
      permittedActions: assignedRole === 'APPLICANT' ? ['VIEW_OWN', 'SUBMIT_CLAIM'] : ['VIEW', 'SUBMIT']
    });

    await user.save();

    const token = generateToken(user);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        linkedIndividual: user.linkedIndividual,
        assignedSchemes: user.assignedSchemes
      }
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, portal } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('assignedSchemes', 'schemeId name code benefitCategory');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or credentials.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please check your credentials.'
      });
    }

    if (user.approvalStatus === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account access has been suspended by administration.'
      });
    }

    // Portal validation (optional portal hint for clean UX errors)
    if (portal === 'AUTHORITY' && user.role === 'APPLICANT') {
      return res.status(403).json({
        success: false,
        message: 'Access restricted: Applicant credentials cannot be used to sign into the Authority Command Centre. Please use the Applicant Portal.'
      });
    }

    if (portal === 'APPLICANT' && !['APPLICANT', 'SUPER_ADMIN'].includes(user.role)) {
      // Allow seamless login or inform
    }

    const token = generateToken(user);

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    await logAudit({
      actingUser: user,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      reasonNotes: `User logged in from ${req.ip || '127.0.0.1'} [Portal: ${portal || 'DIRECT'}]`,
      req
    });

    res.json({
      success: true,
      message: `Welcome, ${user.name}. Authenticated as ${user.role}.`,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        badgeNumber: user.badgeNumber,
        department: user.department,
        assignedSchemes: user.assignedSchemes,
        linkedIndividual: user.linkedIndividual,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAudit({
        actingUser: req.user,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: req.user._id,
        reasonNotes: 'User initiated explicit session logout',
        req
      });
    }

    res.clearCookie('token');
    res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
};

const getDemoAccounts = async (req, res) => {
  res.json({
    success: true,
    accounts: [
      {
        portal: 'APPLICANT',
        role: 'APPLICANT',
        title: 'Verified Citizen Applicant (Arjun Singh)',
        name: 'Arjun Vikram Singh',
        email: 'arjun@jansetu.demo',
        password: 'Password@123',
        demoIdentifier: 'DEMO-AADHAAR-100003',
        description: 'Track submitted education claims, view personalized status timeline, upload missing documents, and explore eligible schemes.'
      },
      {
        portal: 'AUTHORITY',
        role: 'SCHEME_OFFICER',
        title: 'Education Scheme Officer',
        name: 'Sunita Sharma',
        email: 'officer.education@jansetu.gov.demo',
        password: 'Password@123',
        assignedSchemesDescription: 'Restricted strictly to Education & Scholarship Schemes (IEA-2026, SSA-2026)',
        description: 'Authorized to review, verify, and approve/reject claims for assigned Education schemes only.'
      },
      {
        portal: 'AUTHORITY',
        role: 'SCHEME_OFFICER',
        title: 'Housing Scheme Officer',
        name: 'Rajesh Mukherjee',
        email: 'officer.housing@jansetu.gov.demo',
        password: 'Password@123',
        assignedSchemesDescription: 'Restricted strictly to Housing & Sanitation Schemes (HAG-2026, HSS-2026)',
        description: 'Authorized to inspect property records, evaluate competing family claims, and approve housing subsidies.'
      },
      {
        portal: 'AUTHORITY',
        role: 'WELFARE_OFFICER',
        title: 'Senior Welfare Officer',
        name: 'Pooja Verma',
        email: 'officer@jansetu.gov.demo',
        password: 'Password@123',
        assignedSchemesDescription: 'Multi-Scheme Authority (Social Welfare, Education, Health, Agriculture)',
        description: 'Authorized across multiple welfare schemes for comprehensive duplicate and household verification.'
      },
      {
        portal: 'AUTHORITY',
        role: 'RECORDS_ADMIN',
        title: 'Records Administrator & Super Admin',
        name: 'Vikram Singhania',
        email: 'admin@jansetu.gov.demo',
        password: 'Password@123',
        assignedSchemesDescription: 'Full System Administrative Privileges (All Schemes & Core Registries)',
        description: 'Authorized to manage household rosters, resolve identity collisions, configure schemes, and view system-wide audit reports.'
      }
    ]
  });
};

module.exports = {
  register,
  login,
  logout,
  getCurrentUser,
  getDemoAccounts
};
