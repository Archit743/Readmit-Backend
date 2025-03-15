const express = require('express');
const Hospital = require('../models/Hospital');
const router = express.Router();
const { protect } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new hospital
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, department, physicianName } = req.body;
    
    // Check if hospital already exists
    const hospitalExists = await Hospital.findOne({ email });
    
    if (hospitalExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'Hospital with this email already exists' 
      });
    }
    
    // Create new hospital
    const hospital = await Hospital.create({
      name,
      email,
      password,
      department,
      physicianName
    });
    
    // Generate token
    const token = hospital.generateToken();
    
    // Send response
    res.status(201).json({
      success: true,
      token,
      hospitalInfo: {
        id: hospital._id,
        name: hospital.name,
        email: hospital.email,
        department: hospital.department,
        physicianName: hospital.physicianName
      }
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login hospital
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if hospital exists
    const hospital = await Hospital.findOne({ email });
    
    if (!hospital) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Check if password matches
    const isMatch = await hospital.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }
    
    // Generate token
    const token = hospital.generateToken();
    
    // Send response
    res.status(200).json({
      success: true,
      token,
      hospitalInfo: {
        id: hospital._id,
        name: hospital.name,
        email: hospital.email,
        department: hospital.department,
        physicianName: hospital.physicianName
      }
    });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get hospital profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    // Hospital is already available in req.hospital from the protect middleware
    res.status(200).json({
      success: true,
      data: req.hospital
    });
  } catch (error) {
    console.error('Profile error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching profile' 
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update hospital profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const hospitalId = req.hospital._id;
    
    // Fields to update
    const {
      name,
      address,
      city,
      phone,
      email,
      type,
      beds,
      staff,
      department,
      physicianName
    } = req.body;
    
    // Find hospital and update
    const updatedHospital = await Hospital.findByIdAndUpdate(
      hospitalId,
      {
        name,
        address,
        city,
        phone,
        email,
        type,
        beds,
        staff,
        department,
        physicianName
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedHospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital not found'
      });
    }
    
    // Send response with updated info
    res.status(200).json({
      success: true,
      hospitalInfo: {
        id: updatedHospital._id,
        name: updatedHospital.name,
        email: updatedHospital.email,
        address: updatedHospital.address,
        city: updatedHospital.city,
        phone: updatedHospital.phone,
        type: updatedHospital.type,
        beds: updatedHospital.beds,
        staff: updatedHospital.staff,
        department: updatedHospital.department,
        physicianName: updatedHospital.physicianName
      }
    });
  } catch (error) {
    console.error('Profile update error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

module.exports = router;