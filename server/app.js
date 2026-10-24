const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const individualRoutes = require('./routes/individualRoutes');
const householdRoutes = require('./routes/householdRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const schemeRoutes = require('./routes/schemeRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const duplicateAlertRoutes = require('./routes/duplicateAlertRoutes');
const benefitRecordRoutes = require('./routes/benefitRecordRoutes');
const benefitRoutes = require('./routes/benefitRoutes');
const disbursementRoutes = require('./routes/disbursementRoutes');
const documentRoutes = require('./routes/documentRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const reportRoutes = require('./routes/reportRoutes');
const apiIntegrationRoutes = require('./routes/apiIntegrationRoutes');
const eligibilityRoutes = require('./routes/eligibilityRoutes');
const householdAllocationRoutes = require('./routes/householdAllocationRoutes');
const verificationRoutes = require('./routes/verificationRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin like mobile apps, curl, or Postman
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Dev hackathon mode: allow local origins
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Synthetic Demo Notice Header on all responses
app.use((req, res, next) => {
  res.setHeader('X-JanSetu-Data-Mode', 'SYNTHETIC_DEMO_DATA_ONLY');
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'JanSetu Platform API',
    version: '1.0.0',
    dataEnvironment: 'SYNTHETIC_HACKATHON_DEMO',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/individuals', individualRoutes);
app.use('/api/households', householdRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/imported-applications', applicationRoutes);
app.use('/api/duplicate-alerts', duplicateAlertRoutes);
app.use('/api/duplicate-cases', duplicateAlertRoutes);
app.use('/api/benefit-records', benefitRecordRoutes);
app.use('/api/benefits', benefitRoutes);
app.use('/api/disbursements', disbursementRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/analytics', reportRoutes);
app.use('/api/api-integrations', apiIntegrationRoutes);
app.use('/api/integrations', apiIntegrationRoutes);
app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/household-allocations', householdAllocationRoutes);
app.use('/api/allocation-cases', householdAllocationRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/admin', adminRoutes);

// Central error handler
app.use(errorHandler);

module.exports = app;
