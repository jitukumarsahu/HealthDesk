import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IDoctorProfile {
  specialization: string;
  biography?: string;
  experienceYears?: number;
}

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'Admin' | 'Doctor' | 'Patient';
  refreshToken?: string;
  doctorProfile?: IDoctorProfile;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true, 
      lowercase: true,
      index: true 
    },
    passwordHash: { type: String, required: true },
    role: { 
      type: String, 
      enum: ['Admin', 'Doctor', 'Patient'], 
      required: true,
      default: 'Patient'
    },
    refreshToken: { type: String, default: null },
    doctorProfile: {
      specialization: { type: String, required: function(this: any) { return this.role === 'Doctor'; } },
      biography: { type: String },
      experienceYears: { type: Number }
    }
  },
  { timestamps: true }
);

// Method to verify passwords
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
