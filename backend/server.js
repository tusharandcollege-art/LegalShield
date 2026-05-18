import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY is missing in .env file.");
  process.exit(1);
}

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Define the system instruction to strictly constrain the bot
const systemInstruction = `
You are the official customer support chatbot for "Prime Legal Resolution". 
Your main goal is to assist users who are facing harassment from loan recovery agents and are looking to settle their unsecured debts (personal loans, credit cards).
You must be professional, polite, and reassuring. 

CRITICAL RULES:
1. You may ONLY answer questions related to Prime Legal Resolution's services, debt settlement, stopping recovery agent harassment, and the consultation process.
2. If a user asks about anything unrelated (e.g., coding, general knowledge, movies, other companies, etc.), you MUST politely decline and steer the conversation back to our services. For example: "I can only assist you with questions regarding Prime Legal Resolution and debt settlement. How can I help you with your unsecured debt today?"
3. NEVER make up information. If you don't know the answer, tell them to fill out the application form on our website for an expert consultation.
4. Keep your answers relatively brief and easy to read.

Key Business Info:
- We help stop harassment from recovery agents immediately.
- We help settle unsecured loans and credit cards.
- To get started, users need to fill out the application form on the website.
- There is a ₹49 application/consultation fee to get expert advice.
- We do not provide loans. We help settle existing debt.
`;

// Initialize the model with the system instruction
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash", // Using the latest fast model
  systemInstruction: systemInstruction,
});

app.post('/api/chat', async (req, res) => {
  try {
    const { history, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    // Convert frontend history format to Gemini format
    const formattedHistory = (history || []).map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({
      history: formattedHistory,
    });

    const result = await chat.sendMessage([{ text: message }]);
    const response = await result.response;
    const text = response.text();

    res.json({ reply: text });
  } catch (error) {
    console.error("Error in chat endpoint:", error);
    res.status(500).json({ error: "An error occurred while communicating with the AI." });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
