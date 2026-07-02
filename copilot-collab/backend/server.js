const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());

// AI call
async function callAi(code) {
  const apiKey = process.env.AI_API_KEY;
  const apiUrl = process.env.AI_API_URL ?? '';
  const model = process.env.AI_MODEL ?? '';
  const res = await axios.post(
    apiUrl,
    {
      model,
      max_tokens: 2000,
      messages: [{ role: 'user', content: code }],
    },
    {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    }
  );
  return res.data.content?.[0]?.text ?? '';
}

// Suggest endpoint
app.post('/suggest', async (req, res) => {
  const code = req.body.code || '';
  const result = await callAi(code);
  res.json({ result });
});

app.listen(3001, () => console.log('Backend running on http://localhost:3001'));
