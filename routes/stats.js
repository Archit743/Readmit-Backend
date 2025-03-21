const express = require('express');
const Patient = require('../models/Patient');
const { protect } = require('../middleware/auth');
const mongoose = require('mongoose');
const router = express.Router();

// Apply protection middleware to all routes
router.use(protect);

// @route   GET /api/stats/weekly
// @desc    Get weekly statistics for patient readmissions
// @access  Private
router.get('/weekly', async (req, res) => {
  try {
    const currentDate = new Date();
    
    // Calculate start dates for current and previous weeks
    const startOfCurrentWeek = new Date(currentDate);
    startOfCurrentWeek.setDate(currentDate.getDate() - currentDate.getDay());
    startOfCurrentWeek.setHours(0, 0, 0, 0);
    
    const startOfLastWeek = new Date(startOfCurrentWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    
    const endOfLastWeek = new Date(startOfCurrentWeek);
    endOfLastWeek.setSeconds(endOfLastWeek.getSeconds() - 1);
    
    // Query for this week's patients
    const currentWeekPatients = await Patient.find({
      hospitalId: req.hospital._id,
      date: { $gte: startOfCurrentWeek }
    });
    
    // Query for last week's patients
    const lastWeekPatients = await Patient.find({
      hospitalId: req.hospital._id,
      date: { 
        $gte: startOfLastWeek,
        $lt: startOfCurrentWeek
      }
    });
    
    // Calculate current week stats
    const currentWeekStats = calculateStats(currentWeekPatients);
    
    // Calculate last week stats
    const lastWeekStats = calculateStats(lastWeekPatients);
    
    // Prepare trend data for the last 4 weeks
    const trendData = await generateTrendData(req.hospital._id);
    
    res.status(200).json({
      currentWeek: currentWeekStats,
      lastWeek: lastWeekStats,
      trendData
    });
  } catch (error) {
    console.error('Weekly stats error:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while fetching weekly statistics' 
    });
  }
});

// Helper function to calculate stats from patient array
function calculateStats(patients) {
  // Count total patients
  const totalPatients = patients.length;
  
  // Count pending assessments (patients without readmission risk assessment)
  const pendingAssessments = patients.filter(
    patient => !patient.readmissionRisk || patient.readmissionRisk === "Unknown"
  ).length;
  
  // NEW: Count unapproved assessments
  const unapprovedAssessments = patients.filter(
    patient => patient.isApproved === false
  ).length;

  // Calculate average readmission risk for patients who have been assessed
  const assessedPatients = patients.filter(
    patient => patient.readmissionRisk && patient.readmissionRisk !== "Unknown"
  );
  
  let avgReadmissionRisk = 0;
  if (assessedPatients.length > 0) {
    const totalRisk = assessedPatients.reduce(
      (sum, patient) => {
        // Handle both numeric values and percentage strings
        const riskValue = typeof patient.readmissionRisk === 'string' 
          ? parseFloat(patient.readmissionRisk.replace('%', '')) 
          : parseFloat(patient.readmissionRisk);
          
        return isNaN(riskValue) ? sum : sum + riskValue;
      }, 0
    );
    avgReadmissionRisk = totalRisk / assessedPatients.length;
  }
  
  // Count high risk patients (risk > 30%)
  const highRiskPatients = patients.filter(patient => {
    if (!patient.readmissionRisk) return false;
    
    const riskValue = typeof patient.readmissionRisk === 'string' 
      ? parseFloat(patient.readmissionRisk.replace('%', '')) 
      : parseFloat(patient.readmissionRisk);
      
    return !isNaN(riskValue) && riskValue > 30;
  }).length;
  
  return {
    totalPatients,
    pendingAssessments,
    unapprovedAssessments,
    avgReadmissionRisk,
    highRiskPatients
  };
}

// Helper function to generate trend data for the last 4 weeks
async function generateTrendData(hospitalId) {
  const currentDate = new Date();
  const trends = [];
  
  // Generate data for last 4 weeks
  for (let i = 0; i < 4; i++) {
    // Calculate start and end date for the week
    const endDate = new Date(currentDate);
    endDate.setDate(currentDate.getDate() - (currentDate.getDay() + 7 * i));
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    
    // Format week label (e.g., "Mar 1-7")
    const startMonth = startDate.toLocaleString('default', { month: 'short' });
    const endMonth = endDate.toLocaleString('default', { month: 'short' });
    const weekLabel = startMonth === endMonth 
      ? `${startMonth} ${startDate.getDate()}-${endDate.getDate()}`
      : `${startMonth} ${startDate.getDate()}-${endMonth} ${endDate.getDate()}`;
    
    // Query patients for this week
    const weekPatients = await Patient.find({
      hospitalId,
      date: { 
        $gte: startDate,
        $lte: endDate
      }
    });
    
    // Calculate stats
    const stats = calculateStats(weekPatients);
    
    trends.unshift({
      week: weekLabel,
      ...stats
    });
  }
  
  return trends;
}

module.exports = router;