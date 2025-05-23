const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: [true, 'Please add a patient ID'],
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
    trim: true
  },
  age: {
    type: Number,
    required: [true, 'Please add age']
  },
  gender: {
    type: String,
    required: [true, 'Please add gender'],
    enum: ['male', 'female', 'other']
  },
  medicalHistory: {
    type: String,
    trim: true
  },
  currentMedications: {
    type: String,
    trim: true
  },
  diagnosis: {
    type: String,
    required: [true, 'Please add a primary diagnosis'],
    trim: true
  },
  lengthOfStay: {
    type: Number,
    required: [true, 'Please add length of stay']
  },
  previousAdmissions: {
    type: Number,
    default: 0
  },
  readmissionRisk: {
    type: Number,  // Change from String to Number
    default: null  // Remove enum restriction
  },
  fileUrls: {
    type: [String],
    default: []
  },
  date: {
    type: Date,
    default: Date.now
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedAt: {
    type: Date,
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Patient', PatientSchema);