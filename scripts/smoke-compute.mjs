import OpenAI from 'openai';

const model = process.env.ROUTER_MODEL || process.env.MODEL || 'qwen2.5-omni';
const client = new OpenAI({
  apiKey: process.env.ROUTER_API_KEY,
  baseURL: process.env.ROUTER_BASE_URL || 'https://router-api-testnet.integratenetwork.work/v1',
  maxRetries: 1,
  timeout: 20000,
});

console.log('model:', model);
const res = await client.chat.completions.create({
  model,
  messages: [
    { role: 'system', content: 'You are Nova, a warm AI companion. Reply in one short sentence.' },
    { role: 'user', content: 'Hi! Remember that my name is Alex.' },
  ],
});
console.log('reply:', res.choices[0]?.message?.content);
console.log('OK');
