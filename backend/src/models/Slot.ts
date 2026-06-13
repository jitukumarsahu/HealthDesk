import mongoose, { Schema, Document } from 'mongoose';

export interface ISlot extends Document {
  doctorId: mongoose.Types.ObjectId;
  dateTime: Date;
  duration: number; // in minutes
  isBooked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SlotSchema: Schema = new Schema(
  {
    doctorId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
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
    isBooked: { 
      type: Boolean, 
      required: true, 
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

// Compound index to prevent creating duplicate slots for the same doctor at the same time
SlotSchema.index({ doctorId: 1, dateTime: 1 }, { unique: true });

export const Slot = mongoose.model<ISlot>('Slot', SlotSchema);
