// // routes/predictionRoutes.js
// const express = require('express');
// const axios = require('axios');

// const router = express.Router();

// // Flask API URL
// const FLASK_API_URL = 'http://localhost:5001';

// // Health check endpoint
// router.get('/health', async (req, res) => {
//   try {
//     const response = await axios.get(`${FLASK_API_URL}/health`);
//     res.json(response.data);
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to connect to prediction service', details: error.message });
//   }
// });

// // Single prediction endpoint
// router.post('/', async (req, res) => {
//   try {
//     // Forward the request to Flask API
//     const response = await axios.post(`${FLASK_API_URL}/predict`, req.body);
    
//     // Return the prediction result
//     res.json(response.data);
//   } catch (error) {
//     console.error('Prediction error:', error.message);
//     res.status(500).json({ 
//       error: 'Failed to get prediction', 
//       details: error.response ? error.response.data : error.message 
//     });
//   }
// });

// // Batch prediction endpoint
// router.post('/batch-predict', async (req, res) => {
//   try {
//     // Forward the request to Flask API
//     const response = await axios.post(`${FLASK_API_URL}/batch_predict`, req.body);
    
//     // Return the prediction results
//     res.json(response.data);
//   } catch (error) {
//     console.error('Batch prediction error:', error.message);
//     res.status(500).json({ 
//       error: 'Failed to get batch predictions', 
//       details: error.response ? error.response.data : error.message 
//     });
//   }
// });

// module.exports = router;