const express = require('express');
const Patient = require('../models/Patient');
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');
const router = express.Router();

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
      readmissionRisk: readmissionRisk || "Unknown",
      date: date || new Date().toISOString(),
      hospitalId: req.hospital._id
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
    if (readmissionRisk) updateData.readmissionRisk = readmissionRisk;
    
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

module.exports = router;