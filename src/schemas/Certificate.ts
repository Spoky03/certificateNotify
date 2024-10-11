import mongoose from 'mongoose';

const CertificateSchema = new mongoose.Schema({
  Subject: {
    type: String,
    required: true,
  },
    Issuer: {
        type: String,
        required: true,
    },
    Thumbprint: {
        type: String,
        required: true,
    },
    NotBefore: {
        type: String,
        required: true,
    },
    NotAfter: {
        type: String,
        required: true,
    },
    timeRemaining: {
        type: Number,
        required: true,
    },
    notifyBefore: {
        type: Number,
        required: true,
    },
    remote: {
        type: Boolean,
        required: true,
        default: false,
    },
});

export default mongoose.model('Certificate', CertificateSchema);