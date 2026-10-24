const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    actingUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    actingUserName: {
      type: String,
      default: 'System Administrator'
    },
    userRole: {
      type: String,
      default: 'SYSTEM'
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    entityType: {
      type: String,
      required: true,
      index: true
    },
    entityId: {
      type: String,
      required: true,
      index: true
    },
    beforeSnapshot: {
      type: mongoose.Schema.Types.Mixed
    },
    afterSnapshot: {
      type: mongoose.Schema.Types.Mixed
    },
    reasonNotes: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
