// routes/recommendations.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config(); // Load environment variables

// Initialize Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * @route   POST /api/recommendations
 * @desc    Generate patient care recommendations based on risk level using Gemini
 * @access  Private
 */
router.post('/', protect, async (req, res) => {
  try {
    const { riskCategory, riskValue, patientData } = req.body;

    // Validate required inputs
    if (!riskCategory) {
      return res.status(400).json({ message: 'Risk category is required' });
    }

    // Get Gemini Pro model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Build a more personalized and actionable prompt
    let prompt = `Create personalized care recommendations for a patient with ${riskCategory} risk (${riskValue || 'unspecified'} value).`;
    
    // Add patient-specific context
    if (patientData) {
      prompt += ` Based on these patient details:`;
      
      if (patientData.age) prompt += ` Age: ${patientData.age}.`;
      if (patientData.gender) prompt += ` Gender: ${patientData.gender}.`;
      if (patientData.diagnosis) prompt += ` Primary condition: ${patientData.diagnosis}.`;
      if (patientData.comorbidities) prompt += ` Other health conditions: ${patientData.comorbidities.join(', ')}.`;
      if (patientData.medications) prompt += ` Current medications: ${patientData.medications.join(', ')}.`;
      
      prompt += ` Analyze these factors to provide 3-4 personalized recommendations.`;
    }
    
    prompt += ` For each recommendation:
    1. Use simple, everyday language - avoid medical jargon
    2. Be specific and actionable
    3. Keep each recommendation brief (1-2 sentences)
    4. Consider the patient's specific health profile
    
    Format the response as a JSON object with a 'recommendations' array. Each recommendation should have a 'text' field with the easy-to-understand recommendation and a 'category' field (like "Follow-up Care", "Medication", "Lifestyle", "Monitoring").`;

    // Configure generation parameters
    const generationConfig = {
      temperature: 0.2, // Lower temperature for more focused outputs
      maxOutputTokens: 800,
      topP: 0.7,
      topK: 40
    };

    // Generate content with Gemini
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
    });

    const responseText = result.response.text();

    // Parse the Gemini response to extract the JSON
    let recommendations = [];
    try {
      // Find JSON in the response - it might be wrapped in code blocks
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                        responseText.match(/```\n([\s\S]*?)\n```/) ||
                        responseText.match(/{[\s\S]*}/);
      
      const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : responseText;
      const aiResponse = JSON.parse(jsonStr);
      recommendations = aiResponse.recommendations || [];
      
      // Validate the response format
      if (!Array.isArray(recommendations)) {
        throw new Error('Invalid AI response format');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      // Fall back to default recommendations if parsing fails
      recommendations = getFallbackRecommendations(riskCategory);
    }
    
    // Log the response for debugging
    console.log(`Generated ${recommendations.length} recommendations for ${riskCategory} risk patient via Gemini`);
    
    // Respond with the recommendations
    return res.json({ 
      recommendations,
      metadata: {
        riskCategory,
        riskValue,
        generatedAt: new Date().toISOString(),
        source: "ai-generated"
      }
    });
    
  } catch (error) {
    console.error('Error generating recommendations via Gemini:', error);
    
    // Fall back to default recommendations
    const fallbackRecommendations = getFallbackRecommendations(req.body.riskCategory);
    
    return res.json({ 
      recommendations: fallbackRecommendations,
      metadata: {
        riskCategory: req.body.riskCategory,
        riskValue: req.body.riskValue,
        generatedAt: new Date().toISOString(),
        source: "fallback"
      }
    });
  }
});

/**
 * Provides fallback recommendations if the AI service fails
 * @param {string} riskCategory - The risk category (high, medium, low)
 * @returns {Array} Array of recommendation objects
 */
function getFallbackRecommendations(riskCategory) {
  // Updated fallback recommendations with simpler language
  if (riskCategory === 'high') {
    return [
      {
        text: "See your doctor within 2 weeks. Bring a list of any questions or concerns you have.",
        category: "Follow-up Care"
      },
      {
        text: "Work with a care coordinator to help manage your care after leaving the hospital.",
        category: "Support"
      },
      {
        text: "Review your medication schedule with your caregiver or family member.",
        category: "Medication"
      },
      {
        text: "Check your blood pressure, heart rate, and weight daily for the next week.",
        category: "Monitoring"
      }
    ];
  } else if (riskCategory === 'medium') {
    return [
      {
        text: "Schedule a follow-up appointment within the next month.",
        category: "Follow-up Care"
      },
      {
        text: "Take all medications as prescribed and keep track of any side effects.",
        category: "Medication"
      },
      {
        text: "Know the warning signs that require medical attention and when to call your doctor.",
        category: "Home Care"
      },
      {
        text: "Consider a video check-in with your healthcare provider in two weeks.",
        category: "Follow-up Care"
      }
    ];
  } else {
    return [
      {
        text: "Schedule your next regular check-up as recommended by your doctor.",
        category: "Follow-up Care"
      },
      {
        text: "Continue your normal healthy habits including regular exercise and a balanced diet.",
        category: "Lifestyle"
      },
      {
        text: "Take all medications as prescribed and report any concerns to your doctor.",
        category: "Medication"
      }
    ];
  }
}

module.exports = router;