const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// Claude call
async function callClaude(code) {
  const res = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: code }],
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
    }
  );
  return res.data.content?.[0]?.text ?? '';
}

// Suggest endpoint
app.post('/suggest', async (req, res) => {
  const code = req.body.code || '';
  const result = await callClaude(code);
  res.json({ result });
});

app.listen(3001, () => console.log('Backend running on http://localhost:3001'));
