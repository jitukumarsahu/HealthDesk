import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';

interface AuditParams {
  userId: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export const createAuditLog = async (params: AuditParams): Promise<void> => {
  try {
    const log = new AuditLog({
      userId: params.userId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: params.details,
    });
    await log.save();
  } catch (error) {
    logger.error('Failed to write audit log in database:', error);
  }
};
