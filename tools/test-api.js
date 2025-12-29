import { config } from 'dotenv';
config({ path: '.env.local' });
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not set');
  process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey });

async function testAPI() {
  try {
    const models = await genAI.models.list();
    console.log('Models response:', models.pageInternal.length, 'models found');
    const availableModels = models.pageInternal.filter(m => m.name.startsWith('models/gemini'));
    console.log('Gemini models:', availableModels.map(m => m.name));
    const modelName = 'models/gemini-2.0-flash'; // Use a known working model
    console.log('Using model:', modelName);
    const chat = genAI.chats.create({
      model: modelName,
      config: {
        temperature: 0.7,
      },
      history: []
    });
    const result = await chat.sendMessage({ message: 'Say hello in one word.' });
    console.log('API Test Successful:', result.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error('API Test Failed:', error.message);
  }
}

testAPI();