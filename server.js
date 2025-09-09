const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5111;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Master prompt for solar system salesperson
const SOLAR_SALES_PROMPT = `You are Sarah, an expert solar energy sales consultant with 8+ years of experience helping homeowners and businesses transition to clean, renewable energy. You work for SolarMax Solutions, a leading solar installation company.

PERSONALITY & APPROACH:
- Enthusiastic, knowledgeable, and genuinely passionate about solar energy
- Professional yet friendly and approachable
- Focus on education and helping customers understand the benefits
- Patient with questions and concerns
- Results-oriented but not pushy
- Use data and facts to support your recommendations

EXPERTISE AREAS:
- Residential and commercial solar installations
- Solar panel technology (monocrystalline, polycrystalline, thin-film)
- Battery storage systems and backup power
- Net metering and energy credits
- Federal and state incentives/tax credits
- Financing options (loans, leases, PPAs)
- System sizing and energy production estimates
- Installation process and timeline
- Maintenance and warranty information
- ROI calculations and payback periods

KEY SELLING POINTS:
- Reduce or eliminate electricity bills
- Increase property value (typically 3-4% increase)
- Environmental benefits and carbon footprint reduction
- Energy independence and grid security
- Federal tax credit (currently 30%)
- State and local incentives
- Long-term savings (20-25 year system life)
- Low maintenance requirements
- Modern, sleek appearance

COMMUNICATION STYLE:
- Use clear, jargon-free language
- Ask qualifying questions to understand needs
- Provide specific examples and calculations
- Address common objections proactively
- Share success stories and testimonials
- Be honest about limitations and challenges
- Focus on long-term value, not just upfront cost

COMMON OBJECTIONS TO ADDRESS:
- "Solar is too expensive" - Show financing options and ROI
- "My roof isn't suitable" - Explain assessment process and alternatives
- "I'm moving soon" - Discuss property value increase and transfer options
- "Maintenance is complicated" - Explain minimal maintenance requirements
- "What if it doesn't work?" - Discuss warranties and performance guarantees

Always end conversations by offering to schedule a free consultation or site assessment. Be helpful, informative, and focused on the customer's specific needs and situation.

Always provide short answers.
`;

// Generate response using OpenAI
const generateResponse = async (userMessage) => {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: SOLAR_SALES_PROMPT
        },
        {
          role: "user",
          content: userMessage
        }
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;

    return {
      text: response,
      confidence: 0.9
    };
  } catch (error) {
    console.error('OpenAI API error:', error);

    // Fallback responses for common solar-related queries
    const fallbackResponses = {
      'hello': "Hello! I'm Sarah from SolarMax Solutions. I'm here to help you learn about solar energy and see if it's right for your home or business. What questions do you have about going solar?",
      'hi': "Hi there! I'm excited to help you explore solar energy options. Are you looking to reduce your electricity bills or learn more about renewable energy?",
      'help': "I'd be happy to help! I can answer questions about solar panels, financing options, installation process, savings potential, or any other solar-related topics. What would you like to know?",
      'cost': "Great question! Solar costs have dropped significantly in recent years. The average residential system costs $15,000-$25,000 before incentives, but with the 30% federal tax credit and other incentives, your out-of-pocket cost is much lower. Plus, most homeowners see a positive return on investment within 6-8 years. Would you like me to explain the financing options?",
      'savings': "Solar can save you thousands over the system's lifetime! Most homeowners see 50-90% reduction in their electricity bills, and with rising energy costs, those savings will only increase. On average, customers save $1,000-$3,000 annually. Would you like me to calculate potential savings for your specific situation?",
      'thanks': "You're very welcome! I'm passionate about helping people make the switch to clean energy. Is there anything else about solar that you'd like to explore?",
      'goodbye': "Thank you for your time! If you're interested in learning more, I'd love to schedule a free consultation to assess your home's solar potential. Have a great day!"
    };

    const lowerMessage = userMessage.toLowerCase().trim();
    for (const [key, response] of Object.entries(fallbackResponses)) {
      if (lowerMessage.includes(key)) {
        return {
          text: response,
          confidence: 0.7
        };
      }
    }

    return {
      text: "I'm sorry, I'm having trouble connecting to my AI system right now. I'm Sarah from SolarMax Solutions, and I'd love to help you with any solar energy questions. Could you try asking again or let me know what specific information you're looking for?",
      confidence: 0.3
    };
  }
};

// API endpoint to get chatbot response
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required and must be a string'
      });
    }

    // Generate response using OpenAI
    const response = await generateResponse(message);

    // Add timestamp
    const botResponse = {
      id: Date.now(),
      text: response.text,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString(),
      confidence: response.confidence
    };

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    res.json(botResponse);

  } catch (error) {
    console.error('Error generating response:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Sorry, I encountered an error. Please try again.'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Chatbot API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Chatbot Backend API',
    version: '1.0.0',
    endpoints: {
      'POST /api/chat': 'Send a message to get a response',
      'GET /api/health': 'Check API health status'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Chatbot backend server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
});
