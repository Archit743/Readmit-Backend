const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hospital name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  physicianName: {
    type: String,
    required: [true, 'Physician name is required'],
    trim: true
  },
   // New fields for the profile
   address: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  phone: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: ''
  },
  beds: {
    type: String,
    default: ''
  },
  staff: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
hospitalSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to check if password is correct
hospitalSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to generate JWT token
hospitalSchema.methods.generateToken = function() {
  return jwt.sign(
    { id: this._id }, 
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// Remove password from the response
hospitalSchema.methods.toJSON = function() {
  const hospital = this.toObject();
  delete hospital.password;
  return hospital;
};

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital;