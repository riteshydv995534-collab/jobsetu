const AuditLog = require('../models/AuditLog');

/**
 * Creates an immutable audit trail entry for every critical state mutation.
 */
const logAudit = async ({
  actingUser,
  actingUserName = 'System',
  userRole = 'SYSTEM',
  action,
  entityType,
  entityId,
  beforeSnapshot = null,
  afterSnapshot = null,
  reasonNotes = '',
  req = null
}) => {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const userId = actingUser?._id || actingUser || null;
    const userName = actingUser?.name || actingUserName;
    const role = actingUser?.role || userRole;

    const count = await AuditLog.countDocuments();
    const eventId = `AUD-${Date.now()}-${String(count + 1).padStart(4, '0')}`;

    const auditEntry = new AuditLog({
      eventId,
      actingUser: userId,
      actingUserName: userName,
      userRole: role,
      action,
      entityType,
      entityId: String(entityId),
      beforeSnapshot,
      afterSnapshot,
      reasonNotes,
      ipAddress: String(ipAddress)
    });

    await auditEntry.save();
    return auditEntry;
  } catch (error) {
    console.error('[AuditService Error]: Failed to record audit log:', error.message);
    // Audit logging failure should not crash main request in dev, but log error
    return null;
  }
};

module.exports = { logAudit };
