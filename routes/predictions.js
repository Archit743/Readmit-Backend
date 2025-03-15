const express = require('express');
const { protect } = require('../middleware/auth');
const Patient = require('../models/Patient');
const router = express.Router();

// Apply protection middleware to all routes
router.use(protect);

// @route   POST /api/predictions
// @desc    Generate prediction for patient readmission
// @access  Private
router.post('/', async (req, res) => {
  try {
    const patientData = req.body;
    
    // Simple model for predicting readmission risk based on patient data
    // In a real-world scenario, this would be a trained ML model
    const prediction = generateReadmissionPrediction(patientData);
    
    // Update patient record with prediction data if a patient ID is provided
    if (patientData.patientId) {
      await Patient.findOneAndUpdate(
        { 
          _id: patientData.patientId,
          hospitalId: req.hospital._id 
        },
        { 
          'readmissionRisk': {
            score: prediction.readmissionRisk,
            factors: prediction.factors,
            lastUpdated: new Date()
          }
        },
        { new: true }
      );
    }
    
    // Return the prediction
    res.status(200).json(prediction);
  } catch (error) {
    console.error('Prediction error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while generating prediction' 
    });
  }
});

// Function to generate readmission prediction
// This is a simplified model for demonstration purposes
function generateReadmissionPrediction(patientData) {
  // Initialize variables for risk calculation
  let riskScore = 0;
  const factors = [];
  
  // Check for age (higher risk for older patients)
  if (patientData.age) {
    if (patientData.age > 65) {
      riskScore += 20;
      factors.push('Age over 65');
    } else if (patientData.age > 50) {
      riskScore += 10;
      factors.push('Age over 50');
    }
  }
  
  // Check for previous hospitalizations
  if (patientData.previousHospitalizations && patientData.previousHospitalizations.length > 0) {
    const count = patientData.previousHospitalizations.length;
    if (count > 2) {
      riskScore += 25;
      factors.push('Multiple previous hospitalizations');
    } else if (count > 0) {
      riskScore += 15;
      factors.push('Prior hospitalization');
    }
  }
  
  // Check for chronic conditions
  if (patientData.medicalHistory && patientData.medicalHistory.conditions) {
    const conditions = patientData.medicalHistory.conditions;
    
    if (conditions.some(c => c.toLowerCase().includes('diabet'))) {
      riskScore += 15;
      factors.push('Diabetes');
    }
    
    if (conditions.some(c => c.toLowerCase().includes('heart') || c.toLowerCase().includes('cardiac'))) {
      riskScore += 20;
      factors.push('Heart condition');
    }
    
    if (conditions.some(c => c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('blood pressure'))) {
      riskScore += 10;
      factors.push('Hypertension');
    }
    
    if (conditions.some(c => c.toLowerCase().includes('respiratory') || c.toLowerCase().includes('copd') || c.toLowerCase().includes('asthma'))) {
      riskScore += 15;
      factors.push('Respiratory condition');
    }
  }
  
  // Medication count (polypharmacy increases risk)
  if (patientData.medicalHistory && patientData.medicalHistory.medications) {
    const medCount = patientData.medicalHistory.medications.length;
    
    if (medCount > 5) {
      riskScore += 15;
      factors.push('Multiple medications (>5)');
    }
  }
  
  // Length of current stay (if available)
  if (patientData.currentVisit && patientData.currentVisit.admissionDate) {
    const admissionDate = new Date(patientData.currentVisit.admissionDate);
    const currentDate = new Date();
    const stayDuration = Math.floor((currentDate - admissionDate) / (1000 * 60 * 60 * 24));
    
    if (stayDuration > 7) {
      riskScore += 10;
      factors.push('Extended hospital stay (>7 days)');
    }
  }
  
  // Cap the risk score at 100
  riskScore = Math.min(riskScore, 100);
  
  // Return prediction object
  return {
    readmissionRisk: riskScore,
    riskLevel: riskScore < 30 ? 'Low' : riskScore < 60 ? 'Moderate' : 'High',
    factors,
    notes: 'This is a simplified prediction model for demonstration purposes only'
  };
}

module.exports = router;