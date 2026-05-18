const { GoogleGenerativeAI } = require('@google/generative-ai');

module.exports = async (req, res) => {
  // Add CORS headers so the frontend can talk to it if needed (though on Vercel it's same-origin)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { history, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    
    if (!GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY environment variable.");
      return res.status(500).json({ error: "Server configuration error: Missing API Key" });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

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

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction,
    });

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

    res.status(200).json({ reply: text });
  } catch (error) {
    console.error("Error in serverless function:", error);
    res.status(500).json({ error: "An error occurred while communicating with the AI." });
  }
};
