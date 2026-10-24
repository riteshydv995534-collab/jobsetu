const AuditLog = require('../models/AuditLog');

const getAuditLogs = async (req, res, next) => {
  try {
    const { entityType, action, search, page = 1, limit = 15 } = req.query;

    const query = {};
    if (entityType && entityType !== 'ALL') query.entityType = entityType;
    if (action && action !== 'ALL') query.action = action;

    if (search) {
      query.$or = [
        { eventId: { $regex: search, $options: 'i' } },
        { entityId: { $regex: search, $options: 'i' } },
        { reasonNotes: { $regex: search, $options: 'i' } },
        { actingUserName: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .populate('actingUser', 'name email role designation')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs
};
