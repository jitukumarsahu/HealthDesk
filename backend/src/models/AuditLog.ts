import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId | null; // null if unauthenticated, e.g. login failed
  action: string;                         // e.g. "AUTH_LOGIN_SUCCESS", "VIEW_PRESCRIPTION"
  resource: string;                       // e.g. "Prescription", "Appointment", "Auth"
  resourceId?: string;                    // ID of the target resource
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  createdAt: Date;
}

const AuditLogSchema: Schema = new Schema(
  {
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User',
      default: null,
      index: true
    },
    action: { 
      type: String, 
      required: true,
      trim: true,
      index: true 
    },
    resource: { 
      type: String, 
      required: true,
      trim: true,
      index: true 
    },
    resourceId: { 
      type: String,
      trim: true,
      index: true 
    },
    ipAddress: { type: String, trim: true },
    userAgent: { type: String, trim: true },
    details: { type: Schema.Types.Mixed }
  },
  { 
    // We only want createdAt for audits. Updates are not allowed.
    timestamps: { createdAt: true, updatedAt: false } 
  }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
