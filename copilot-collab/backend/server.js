const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// GPT-4 Turbo call
async function callGPT(code) {
  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4o-turbo',
      messages: [{ role: 'user', content: code }],
    },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
  );
  return res.data.choices[0].message.content;
}

// Claude 3 call
async function callClaude(code) {
  const res = await axios.post(
    'https://api.anthropic.com/v1/complete',
    {
      model: 'claude-3',
      prompt: code,
      max_tokens: 2000,
    },
    { headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY } }
  );
  return res.data.completion;
}

// Suggest endpoint
app.post('/suggest', async (req, res) => {
  const code = req.body.code || '';
  const [gpt, claude] = await Promise.all([callGPT(code), callClaude(code)]);
  res.json({ gpt, claude });
});

app.listen(3001, () => console.log('Backend running on http://localhost:3001'));