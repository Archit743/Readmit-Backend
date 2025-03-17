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

    // Build a more technical prompt for doctors with concise output
    let prompt = `Generate exactly 5-6 concise, evidence-based clinical recommendations for a patient with ${riskCategory} readmission risk (${riskValue || 'unspecified'} value).`;
    
    // Add patient-specific context
    if (patientData) {
      prompt += ` Clinical data: `;
      
      if (patientData.age) prompt += `Age: ${patientData.age}. `;
      if (patientData.gender) prompt += `Gender: ${patientData.gender}. `;
      if (patientData.diagnosis) prompt += `Dx: ${patientData.diagnosis}. `;
      if (patientData.comorbidities) prompt += `Comorbidities: ${patientData.comorbidities.join(', ')}. `;
      if (patientData.medications) prompt += `Meds: ${patientData.medications.join(', ')}. `;
    }
    
    prompt += ` For each recommendation:
    1. Use precise clinical terminology appropriate for physicians
    2. Keep each recommendation to 1-2 concise sentences maximum
    3. Be direct and actionable with specific timeframes
    4. Avoid lengthy rationales or explanations
    5. Focus on highest-impact interventions based on risk level
    6. Limit to exactly 5-6 total recommendations
    
    Format the response as a JSON object with a 'recommendations' array. Each recommendation should have a 'text' field with the concise clinical recommendation and a 'category' field (e.g., "Follow-up", "Medication", "Monitoring", "Referral", "Testing").`;

    // Configure generation parameters
    const generationConfig = {
      temperature: 0.2, // Lower for more consistent, precise outputs
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
      
      // Validate the response format and limit to 6 recommendations
      if (!Array.isArray(recommendations)) {
        throw new Error('Invalid AI response format');
      }
      
      // Enforce the 5-6 recommendation limit
      if (recommendations.length > 6) {
        recommendations = recommendations.slice(0, 6);
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
  // Shortened, technical fallback recommendations for physicians
  if (riskCategory === 'high') {
    return [
      {
        text: "Schedule follow-up within 14 days post-discharge with medication reconciliation.",
        category: "Follow-up"
      },
      {
        text: "Implement TCM services with 48-hour post-discharge contact.",
        category: "Care Coordination"
      },
      {
        text: "Daily vital sign monitoring (BP, HR, weight) for 7 days with alert parameters.",
        category: "Monitoring"
      },
      {
        text: "Pharmacist consult for comprehensive medication review.",
        category: "Medication"
      },
      {
        text: "Assess candidacy for home health services with ADL evaluation.",
        category: "Home Care"
      }
    ];
  } else if (riskCategory === 'medium') {
    return [
      {
        text: "Follow-up within 30 days with focused reassessment of primary condition.",
        category: "Follow-up"
      },
      {
        text: "Medication adherence assessment at 14 days post-discharge.",
        category: "Medication"
      },
      {
        text: "Telehealth evaluation at 14 days to assess treatment response.",
        category: "Monitoring"
      },
      {
        text: "Disease-specific education on exacerbation warning signs requiring urgent evaluation.",
        category: "Education"
      },
      {
        text: "Lab monitoring within 30 days for relevant parameters based on diagnosis and therapy.",
        category: "Testing"
      }
    ];
  } else {
    return [
      {
        text: "Routine follow-up per standard clinical protocols.",
        category: "Follow-up"
      },
      {
        text: "Standard medication reconciliation at next visit.",
        category: "Medication"
      },
      {
        text: "Disease-specific preventive care measures per guidelines.",
        category: "Prevention"
      },
      {
        text: "Routine surveillance for condition progression per guidelines.",
        category: "Monitoring"
      },
      {
        text: "Quality metrics assessment at next scheduled encounter.",
        category: "Quality"
      }
    ];
  }
}

module.exports = router;