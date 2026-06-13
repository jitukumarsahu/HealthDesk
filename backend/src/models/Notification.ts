import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'AppointmentBooked' | 'AppointmentCancelled' | 'ScheduleUpdated' | 'PrescriptionCreated' | 'SystemAlert';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipientId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    title: { 
      type: String, 
      required: true,
      trim: true 
    },
    message: { 
      type: String, 
      required: true,
      trim: true 
    },
    type: { 
      type: String, 
      enum: ['AppointmentBooked', 'AppointmentCancelled', 'ScheduleUpdated', 'PrescriptionCreated', 'SystemAlert'], 
      required: true 
    },
    isRead: { 
      type: Boolean, 
      required: true, 
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
