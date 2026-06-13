import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  slotId?: mongoose.Types.ObjectId;
  dateTime: Date;
  duration: number; // in minutes
  status: 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed' | 'Rescheduled';
  reason: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema(
  {
    patientId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    doctorId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    slotId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Slot',
      index: true
    },
    dateTime: { 
      type: Date, 
      required: true,
      index: true
    },
    duration: { 
      type: Number, 
      required: true, 
      default: 30 
    },
    status: { 
      type: String, 
      enum: ['Pending', 'Confirmed', 'Cancelled', 'Completed', 'Rescheduled'], 
      required: true,
      default: 'Pending'
    },
    reason: { 
      type: String, 
      required: true,
      trim: true 
    },
    notes: { 
      type: String,
      trim: true 
    }
  },
  { timestamps: true }
);

export const Appointment = mongoose.model<IAppointment>('Appointment', AppointmentSchema);
