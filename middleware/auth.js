const jwt = require('jsonwebtoken');
const Hospital = require('../models/Hospital');

const protect = async (req, res, next) => {
  let token;
  
  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // Check if token exists
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized to access this resource' 
    });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get hospital from token
    const hospital = await Hospital.findById(decoded.id);
    
    if (!hospital) {
      return res.status(401).json({ 
        success: false, 
        message: 'Hospital not found' 
      });
    }
    
    // Add hospital to request object
    req.hospital = hospital;
    next();
  } catch (error) {
    console.error('JWT Verification error:', error.message);
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized to access this resource' 
    });
  }
};

module.exports = { protect };