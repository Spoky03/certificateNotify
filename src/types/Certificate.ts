import { Document, ObjectId } from 'mongoose';

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

export interface User extends Document {
  email: string;
  password: string;
  certificates: Certificate[]; // Adjust the type of certificates to an array of Certificate
  globalNotification: number;
  _id: ObjectId; 
}