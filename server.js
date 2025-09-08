import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
// Allow requests from your cPanel domain and localhost for development
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3003',
  'https://ds-landing.42web.io', // Your actual domain
  'https://www.ds-landing.42web.io', // Your actual domain with www
  'https://chat-app.infinityfree.me', // Your actual hosting domain
  'http://69.197.187.24:3003', // Your React frontend
  'https://69.197.187.24:3003', // Your React frontend (HTTPS)
];

app.use(cors({ 
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));
app.use(express.json());

/**
 * Simple responder
 * - By default: a basic, rules + echo bot (no external API).
 * - If you have a model API key (e.g., OPENAI_API_KEY), uncomment the AI code below.
 */
function basicResponder(history) {
    const lastUser = [...history].reverse().find(m => m.role === "user");
    const text = lastUser?.content?.trim() || "Hello!";
    if (/hello|hi|hey/i.test(text)) return "Hi! How can I help?";
    if (/help|support/i.test(text)) return "Tell me what you’re trying to do—I'll walk you through it.";
    return `You said: "${text}". I’m a demo bot—ask me anything.`;
}

app.post("/api/chat", async (req, res) => {
    try {
        const { messages = [] } = req.body;

        // --- BASIC (no external API) ---
        const reply = basicResponder(messages);
        return res.json({ reply });

        // --- AI VIA PROVIDER (optional) ---
        // if (!process.env.OPENAI_API_KEY) {
        //   return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
        // }
        // const response = await fetch("https://api.openai.com/v1/chat/completions", {
        //   method: "POST",
        //   headers: {
        //     "Content-Type": "application/json",
        //     "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        //   },
        //   body: JSON.stringify({
        //     model: "gpt-4o-mini",
        //     messages
        //   })
        // });
        // const data = await response.json();
        // const aiText = data?.choices?.[0]?.message?.content ?? "Sorry, I couldn't generate a reply.";
        // return res.json({ reply: aiText });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/", (_req, res) => {
    res.send("Chatbot backend is running.");
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
