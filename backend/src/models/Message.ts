import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  appointmentId: mongoose.Types.ObjectId;
  text: string;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    senderId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    receiverId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true,
      index: true
    },
    appointmentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Appointment', 
      required: true,
      index: true
    },
    text: { 
      type: String, 
      required: true,
      trim: true 
    }
  },
  { 
    timestamps: { createdAt: true, updatedAt: false } 
  }
);

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
