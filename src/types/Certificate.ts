import { Document } from 'mongoose';

export interface Certificate extends Document {
  Subject: string;
  Issuer: string;
  Thumbprint: string;
  NotBefore: string;
  NotAfter: string;
  timeRemaining: number;
  notifyBefore: number;
  _id: Object; // Adjust the type of _id to ObjectId
}