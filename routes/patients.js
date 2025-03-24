const express = require('express');
const Patient = require('../models/Patient');
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');
const router = express.Router();
const axios = require('axios');

const FLASK_API_URL = 'https://flask-readmit-microservice.onrender.com';


// ============= PREDICTION ROUTES =============

// @route   GET /api/patients/predict/health
// @desc    Health check for prediction service
// @access  Private
router.get('/predict/health', async (req, res) => {
  try {
    const response = await axios.get(`${FLASK_API_URL}/health`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to connect to prediction service', 
      details: error.message 
    });
  }
});

// @route   POST /api/patients/predict
// @desc    Get prediction for a single patient
// @access  Private
router.post('/predict', async (req, res) => {
  try {
    const { fileUrls } = req.body;
    
    if (!fileUrls || !fileUrls.length) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file URLs provided' 
      });
    }
    
    // Pass the URL directly to Flask API without processing it
    const response = await axios.post(`${FLASK_API_URL}/predict`, { pdfUrl: fileUrls[0] });
    
    // Return the prediction result
    res.json(response.data);
  } catch (error) {
    console.error('Prediction error:', error.message);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get prediction', 
      details: error.response ? error.response.data : error.message 
    });
  }
});

// Apply protection middleware to all routes
router.use(protect);

// @route   GET /api/patients
// @desc    Get all patients for the hospital
// @access  Private
router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find({ hospitalId: req.hospital._id });
    
    res.status(200).json(patients);
  } catch (error) {
    console.error('Fetch patients error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching patients' 
    });
  }
});

// @route   POST /api/patients
// @desc    Create a new patient
// @access  Private
router.post('/', async (req, res) => {
  try {
    // Extract fields from request body
    const {
      patientId,
      firstName,
      lastName,
      age,
      gender,
      medicalHistory,
      currentMedications,
      primaryDiagnosis,
      lengthOfStay,
      previousAdmissions,
      fileUrls,
      readmissionRisk,
      date
    } = req.body;
    
    // Create patient object with required fields
    const patientData = {
      patientId,
      firstName,
      lastName,
      age: parseInt(age),
      gender,
      medicalHistory,
      currentMedications,
      diagnosis: primaryDiagnosis, // Map to diagnosis field in DB
      lengthOfStay: parseInt(lengthOfStay),
      previousAdmissions: parseInt(previousAdmissions),
      fileUrls: Array.isArray(fileUrls) ? fileUrls : [],
      readmissionRisk: readmissionRisk ? parseFloat(readmissionRisk) : null,
      date: date || new Date().toISOString(),
      hospitalId: req.hospital._id,
      isApproved: req.body.isApproved || false,
      approvedAt: req.body.isApproved ? new Date() : null,
      approvedBy: req.body.isApproved ? req.user._id : null
    };
    
    // Create new patient
    const patient = await Patient.create(patientData);
    
    res.status(201).json(patient);
  } catch (error) {
    console.error('Create patient error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        success: false, 
        message: messages.join(', ') 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error while creating patient' 
    });
  }
});

// @route   GET /api/patients/:id
// @desc    Get patient by ID
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid patient ID' 
      });
    }
    
    // Find patient
    const patient = await Patient.findOne({
      _id: req.params.id,
      hospitalId: req.hospital._id
    });
    
    // Check if patient exists
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }
    
    res.status(200).json(patient);
  } catch (error) {
    console.error('Get patient error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching patient' 
    });
  }
});

// @route   PUT /api/patients/:id
// @desc    Update patient
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid patient ID' 
      });
    }
    
    // Extract and process data similar to POST route
    const {
      firstName,
      lastName,
      age,
      gender,
      medicalHistory,
      currentMedications,
      primaryDiagnosis,
      lengthOfStay,
      previousAdmissions,
      fileUrls,
      readmissionRisk
    } = req.body;
    
    // Create update object
    const updateData = {};
    
    // Only add fields that are provided in the request
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (age) updateData.age = parseInt(age);
    if (gender) updateData.gender = gender;
    if (medicalHistory) updateData.medicalHistory = medicalHistory;
    if (currentMedications) updateData.currentMedications = currentMedications;
    if (primaryDiagnosis) updateData.diagnosis = primaryDiagnosis;
    if (lengthOfStay) updateData.lengthOfStay = parseInt(lengthOfStay);
    if (previousAdmissions) updateData.previousAdmissions = parseInt(previousAdmissions);
    if (fileUrls) updateData.fileUrls = Array.isArray(fileUrls) ? fileUrls : [];
    if (readmissionRisk !== undefined) updateData.readmissionRisk = parseFloat(readmissionRisk);
    if (req.body.hasOwnProperty('isApproved')) {
      updateData.isApproved = !!req.body.isApproved;
      updateData.approvedAt = req.body.isApproved ? new Date() : null;
      updateData.approvedBy = req.body.isApproved ? req.body.approvedBy || req.user._id : null;
    }
    
    // Find and update patient
    const patient = await Patient.findOneAndUpdate(
      {
        _id: req.params.id,
        hospitalId: req.hospital._id
      },
      updateData,
      { new: true, runValidators: true }
    );
    
    // Check if patient exists
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }
    
    res.status(200).json(patient);
  } catch (error) {
    console.error('Update patient error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ 
        success: false, 
        message: messages.join(', ') 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating patient' 
    });
  }
});

// @route   DELETE /api/patients/:id
// @desc    Delete patient
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    // Check if ID is valid
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid patient ID' 
      });
    }
    
    // Find and delete patient
    const patient = await Patient.findOneAndDelete({
      _id: req.params.id,
      hospitalId: req.hospital._id
    });
    
    // Check if patient exists
    if (!patient) {
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }
    
    res.status(200).json({ 
      success: true, 
      data: patient._id 
    });
  } catch (error) {
    console.error('Delete patient error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting patient' 
    });
  }
});

// @route   PATCH /api/patients/:id/approval
// @desc    Update patient approval status
// @access  Private
router.patch('/:id/approval', async (req, res) => {
  try {
    console.log('Approval request for patient ID:', req.params.id);
    console.log('Request body:', req.body);
    
    const { isApproved, approvedAt } = req.body;
    
    // Create update object with approval data
    const updateData = {
      isApproved: !!isApproved,
      approvedAt: approvedAt || (isApproved ? new Date() : null)
    };
    
    if (isApproved) {
      updateData.approvedBy = req.hospital._id;
    } else {
      updateData.approvedBy = null;
    }
    
    // Find and update the patient
    const patient = await Patient.findOneAndUpdate(
      {
        patientId: req.params.id,
        hospitalId: req.hospital._id
      },
      updateData,
      { new: true }
    );
    
    // Check if patient exists
    if (!patient) {
      console.log('Patient not found for ID:', req.params.id);
      return res.status(404).json({ 
        success: false, 
        message: 'Patient not found' 
      });
    }
    
    console.log('Successfully updated patient:', patient);
    res.status(200).json(patient);
  } catch (error) {
    console.error('Update approval status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating approval status',
      error: error.message
    });
  }
});




module.exports = router;