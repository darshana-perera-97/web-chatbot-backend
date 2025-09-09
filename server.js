const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5111;

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Session management
const CHAT_IDS_FILE = path.join(__dirname, 'data', 'chatIds.json');
const CHATS_FILE = path.join(__dirname, 'data', 'chats.json');

// Load existing session IDs
const loadSessionIds = () => {
  try {
    if (fs.existsSync(CHAT_IDS_FILE)) {
      const data = fs.readFileSync(CHAT_IDS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading session IDs:', error);
  }
  return [];
};

// Save session IDs
const saveSessionIds = (sessionIds) => {
  try {
    fs.writeFileSync(CHAT_IDS_FILE, JSON.stringify(sessionIds, null, 2));
  } catch (error) {
    console.error('Error saving session IDs:', error);
  }
};

// Load existing chat messages
const loadChats = () => {
  try {
    if (fs.existsSync(CHATS_FILE)) {
      const data = fs.readFileSync(CHATS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading chats:', error);
  }
  return {};
};

// Save chat messages
const saveChats = (chats) => {
  try {
    fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
  } catch (error) {
    console.error('Error saving chats:', error);
  }
};

// Generate a new session ID
const generateSessionId = () => {
  return uuidv4();
};

// Add message to session
const addMessageToSession = (sessionId, message) => {
  // Load current data
  const sessionIds = loadSessionIds();
  const chats = loadChats();
  
  // Initialize chat array for session if it doesn't exist
  if (!chats[sessionId]) {
    chats[sessionId] = [];
  }
  
  // Add message to chats
  chats[sessionId].push({
    ...message,
    timestamp: new Date().toISOString()
  });

  // Log message storage
  console.log(`💾 STORED | ${message.sender.toUpperCase()} | ${sessionId} | ${new Date().toISOString()} | ${message.text.substring(0, 50)}${message.text.length > 50 ? '...' : ''}`);
  
  // Update or add session ID entry
  const existingSessionIndex = sessionIds.findIndex(session => session.sessionId === sessionId);
  const now = new Date().toISOString();
  
  if (existingSessionIndex >= 0) {
    // Update existing session's lastChatTime
    sessionIds[existingSessionIndex].lastChatTime = now;
  } else {
    // Add new session entry
    sessionIds.push({
      sessionId: sessionId,
      createdTime: now,
      lastChatTime: now
    });
  }
  
  // Save both files
  saveSessionIds(sessionIds);
  saveChats(chats);
  
  return {
    sessionId: sessionId,
    messages: chats[sessionId]
  };
};

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'], // Admin and chatbot ports
  credentials: true
}));
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
const generateResponse = async (userMessage, chatHistory = []) => {
  try {
    // Build messages array with system prompt, chat history, and current user message
    const messages = [
      {
        role: "system",
        content: SOLAR_SALES_PROMPT
      }
    ];

    // Add chat history to provide context
    if (chatHistory && chatHistory.length > 0) {
      console.log(`📚 Using ${chatHistory.length} previous messages for context`);
      chatHistory.forEach(msg => {
        // Convert our message format to OpenAI format
        if (msg.sender === 'user') {
          messages.push({
            role: "user",
            content: msg.text
          });
        } else if (msg.sender === 'bot') {
          messages.push({
            role: "assistant",
            content: msg.text
          });
        }
        // Skip admin messages as they shouldn't influence AI responses
      });
    } else {
      console.log('🆕 No previous context available - starting fresh conversation');
    }

    // Add the current user message
    messages.push({
      role: "user",
      content: userMessage
    });

    console.log(`🤖 Sending ${messages.length} messages to OpenAI (including system prompt)`);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 100,
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

// API endpoint to create a new session
app.post('/api/session', (req, res) => {
  try {
    const sessionId = generateSessionId();
    const now = new Date().toISOString();
    
    // Add new session to session IDs array
    const sessionIds = loadSessionIds();
    sessionIds.push({
      sessionId: sessionId,
      createdTime: now,
      lastChatTime: now
    });
    
    // Initialize empty chat array for this session
    const chats = loadChats();
    chats[sessionId] = [];
    
    // Save both files
    saveSessionIds(sessionIds);
    saveChats(chats);

    // Log session creation
    console.log(`🆕 SESSION | CREATED | ${sessionId} | ${now} | New session created`);
    
    res.json({ sessionId });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to create session'
    });
  }
});

// API endpoint to get chatbot response
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId, senderType = 'user' } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }
    
    // Create user message
    const userMessage = {
      id: Date.now(),
      text: message,
      sender: senderType,
      timestamp: new Date().toLocaleTimeString()
    };

    // Log incoming message
    console.log(`📨 INCOMING | ${senderType.toUpperCase()} | ${sessionId || 'NO_SESSION'} | ${new Date().toISOString()} | ${message}`);
    
    // Store user message in session if sessionId is provided
    if (sessionId) {
      addMessageToSession(sessionId, userMessage);
    }
    
    // Only generate OpenAI response for regular user messages, not admin messages
    if (senderType === 'user') {
      // Get chat history for context
      let chatHistory = [];
      if (sessionId) {
        const chats = loadChats();
        chatHistory = chats[sessionId] || [];
      }
      
      // Generate response using OpenAI with chat history
      const response = await generateResponse(message, chatHistory);
      
      // Create bot response
      const botResponse = {
        id: Date.now() + 1,
        text: response.text,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString(),
        confidence: response.confidence
      };

      // Log outgoing bot response
      console.log(`🤖 OUTGOING | BOT | ${sessionId || 'NO_SESSION'} | ${new Date().toISOString()} | ${response.text}`);
      
      // Store bot response in session if sessionId is provided
      if (sessionId) {
        addMessageToSession(sessionId, botResponse);
      }
      
      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      res.json(botResponse);
    } else {
      // For admin messages, just return the message without generating AI response
      console.log(`👨‍💼 ADMIN | ADMIN | ${sessionId || 'NO_SESSION'} | ${new Date().toISOString()} | ${message}`);
      
      res.json({
        success: true,
        message: 'Admin message sent successfully',
        adminMessage: userMessage
      });
    }
    
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Sorry, I encountered an error. Please try again.'
    });
  }
});

// API endpoint to get session data
app.get('/api/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionIds = loadSessionIds();
    const chats = loadChats();
    
    const session = sessionIds.find(s => s.sessionId === sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    const sessionChats = chats[sessionId] || [];
    
    res.json({
      sessionId: session.sessionId,
      createdTime: session.createdTime,
      lastChatTime: session.lastChatTime,
      messages: sessionChats
    });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to get session data'
    });
  }
});

// API endpoint to get all sessions
app.get('/api/sessions', (req, res) => {
  try {
    const sessionIds = loadSessionIds();
    res.json(sessionIds);
  } catch (error) {
    console.error('Error getting sessions:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to get sessions'
    });
  }
});

// API endpoint to get analytics data
app.get('/api/analytics', (req, res) => {
  try {
    const sessionIds = loadSessionIds();
    const chats = loadChats();
    
    // Calculate analytics
    const totalSessions = sessionIds.length;
    const totalChats = Object.values(chats).reduce((total, sessionChats) => {
      return total + (sessionChats ? sessionChats.length : 0);
    }, 0);
    
    const recurringUsers = sessionIds.filter(session => {
      return new Date(session.lastChatTime) > new Date(session.createdTime);
    }).length;
    
    const uniqueUsers = totalSessions;
    
    // Calculate average chats per session
    const avgChatsPerSession = totalSessions > 0 ? (totalChats / totalSessions).toFixed(2) : 0;
    
    // Calculate conversion rate (recurring users / total users)
    const conversionRate = totalSessions > 0 ? ((recurringUsers / totalSessions) * 100).toFixed(1) : 0;
    
    // Get recent activity (last 24 hours)
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentSessions = sessionIds.filter(session => {
      return new Date(session.lastChatTime) > last24Hours;
    }).length;
    
    const recentChats = Object.values(chats).reduce((total, sessionChats) => {
      if (!sessionChats) return total;
      return total + sessionChats.filter(msg => {
        return new Date(msg.timestamp) > last24Hours;
      }).length;
    }, 0);
    
    res.json({
      websites: 1,
      totalChats: totalChats,
      totalUsers: uniqueUsers,
      recurringUsers: recurringUsers,
      avgChatsPerSession: parseFloat(avgChatsPerSession),
      conversionRate: parseFloat(conversionRate),
      recentActivity: {
        sessions: recentSessions,
        chats: recentChats
      },
      lastUpdated: now.toISOString()
    });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to get analytics data'
    });
  }
});

// API endpoint for admin to send replies
app.post('/api/admin/reply', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ 
        error: 'Message is required and must be a string' 
      });
    }
    
    if (!sessionId) {
      return res.status(400).json({ 
        error: 'Session ID is required' 
      });
    }
    
    // Create admin message
    const adminMessage = {
      id: Date.now(),
      text: message,
      sender: 'admin',
      timestamp: new Date().toLocaleTimeString()
    };

    // Log admin message
    console.log(`👨‍💼 ADMIN | ADMIN | ${sessionId} | ${new Date().toISOString()} | ${message}`);
    
    // Store admin message in session
    addMessageToSession(sessionId, adminMessage);
    
    res.json({
      success: true,
      message: 'Admin reply sent successfully',
      adminMessage: adminMessage
    });
    
  } catch (error) {
    console.error('Error sending admin reply:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to send admin reply'
    });
  }
});

// API endpoint to get chat statistics
app.get('/api/chat-stats', (req, res) => {
  try {
    const sessionIds = loadSessionIds();
    const chats = loadChats();
    
    // Get all messages across all sessions
    const allMessages = Object.values(chats).flat();
    
    // Calculate message statistics
    const userMessages = allMessages.filter(msg => msg.sender === 'user');
    const botMessages = allMessages.filter(msg => msg.sender === 'bot');
    
    // Get average response time (simplified)
    const responseTimes = [];
    for (let i = 0; i < allMessages.length - 1; i++) {
      if (allMessages[i].sender === 'user' && allMessages[i + 1].sender === 'bot') {
        const responseTime = new Date(allMessages[i + 1].timestamp) - new Date(allMessages[i].timestamp);
        responseTimes.push(responseTime);
      }
    }
    
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length 
      : 0;
    
    // Get most common user messages (top 5)
    const messageCounts = {};
    userMessages.forEach(msg => {
      const text = msg.text.toLowerCase().trim();
      if (text.length > 0) {
        messageCounts[text] = (messageCounts[text] || 0) + 1;
      }
    });
    
    const topMessages = Object.entries(messageCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([text, count]) => ({ text, count }));
    
    res.json({
      totalMessages: allMessages.length,
      userMessages: userMessages.length,
      botMessages: botMessages.length,
      avgResponseTime: Math.round(avgResponseTime / 1000), // in seconds
      topUserMessages: topMessages,
      sessionsWithMessages: Object.keys(chats).filter(sessionId => 
        chats[sessionId] && chats[sessionId].length > 0
      ).length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting chat stats:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to get chat statistics'
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
      'POST /api/chat': 'Send a message to get a response (supports senderType: user/admin)',
      'POST /api/session': 'Create a new chat session',
      'GET /api/session/:sessionId': 'Get session data and chat history',
      'GET /api/sessions': 'Get all sessions',
      'POST /api/admin/reply': 'Send admin reply to user (no OpenAI response)',
      'GET /api/analytics': 'Get analytics data for admin dashboard',
      'GET /api/chat-stats': 'Get detailed chat statistics',
      'GET /api/health': 'Check API health status'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Chatbot backend server running on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`🏥 Health check at http://localhost:${PORT}/api/health`);
});
