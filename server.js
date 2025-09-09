import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 5111;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Simple response generation logic
const generateResponse = (userMessage) => {
  const message = userMessage.toLowerCase().trim();
  
  // Basic keyword matching with more sophisticated responses
  if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
    return {
      text: "Hello! I'm your AI assistant. How can I help you today?",
      confidence: 0.9
    };
  }
  
  if (message.includes('help')) {
    return {
      text: "I'm here to assist you! I can help with general questions, provide information, or just have a conversation. What would you like to know?",
      confidence: 0.8
    };
  }
  
  if (message.includes('thanks') || message.includes('thank you')) {
    return {
      text: "You're very welcome! I'm happy to help. Is there anything else you'd like to know?",
      confidence: 0.9
    };
  }
  
  if (message.includes('goodbye') || message.includes('bye')) {
    return {
      text: "Goodbye! It was nice chatting with you. Have a wonderful day!",
      confidence: 0.9
    };
  }
  
  if (message.includes('how are you') || message.includes('how do you feel')) {
    return {
      text: "I'm doing great, thank you for asking! I'm always ready to help and learn new things. How are you doing today?",
      confidence: 0.8
    };
  }
  
  if (message.includes('weather')) {
    return {
      text: "I don't have access to real-time weather data, but I'd recommend checking a weather service like Weather.com or your local weather app for current conditions!",
      confidence: 0.7
    };
  }
  
  if (message.includes('time') || message.includes('date')) {
    const now = new Date();
    return {
      text: `The current time is ${now.toLocaleString()}. Is there anything specific about time or scheduling I can help you with?`,
      confidence: 0.8
    };
  }
  
  if (message.includes('name')) {
    return {
      text: "I'm an AI assistant created to help you with various tasks and questions. You can call me whatever you'd like! What's your name?",
      confidence: 0.7
    };
  }
  
  // Default response for unrecognized messages
  const defaultResponses = [
    "That's an interesting question! Could you tell me more about what you're looking for?",
    "I'm not sure I fully understand. Could you rephrase that or ask me something else?",
    "That's a great point! I'd love to help, but could you provide a bit more context?",
    "I'm here to help! Could you be more specific about what you need assistance with?",
    "Interesting! I'm still learning, but I'd be happy to try to help if you can give me more details."
  ];
  
  const randomResponse = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  
  return {
    text: randomResponse,
    confidence: 0.3
  };
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
    
    // Generate response
    const response = generateResponse(message);
    
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
