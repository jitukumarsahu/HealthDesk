import mongoose, { Schema, Document } from 'mongoose';

export interface IMedicine {
  name: string;
  dosage: string;      // e.g., "500mg" or "1 tablet"
  frequency: string;   // e.g., "1-0-1" or "Once daily"
  duration: string;    // e.g., "5 days" or "1 month"
}

export interface IPrescription extends Document {
  appointmentId?: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  date: Date;
  medicines: IMedicine[];
  consultationNotes: string;
  createdAt: Date;
  updatedAt: Date;
}

const MedicineSchema = new Schema({
  name: { type: String, required: true, trim: true },
  dosage: { type: String, required: true, trim: true },
  frequency: { type: String, required: true, trim: true },
  duration: { type: String, required: true, trim: true }
}, { _id: false });

const PrescriptionSchema: Schema = new Schema(
  {
    appointmentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Appointment',
      index: true
    },
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
    date: { 
      type: Date, 
      required: true, 
      default: Date.now,
      index: true
    },
    medicines: { 
      type: [MedicineSchema], 
      required: true,
      validate: [
        (val: IMedicine[]) => val.length > 0, 
        'Prescription must have at least one medicine'
      ]
    },
    consultationNotes: { 
      type: String, 
      required: true,
      trim: true 
    }
  },
  { timestamps: true }
);

export const Prescription = mongoose.model<IPrescription>('Prescription', PrescriptionSchema);
