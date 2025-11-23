import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

console.log('API Key:', process.env.GOOGLE_API_KEY ? 'present' : 'missing');

if (process.env.GOOGLE_API_KEY) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });
    console.log('Model created successfully');
    
    // Test simple generation
    const result = await model.generateContent('Say hello in 5 words');
    console.log('AI Response:', result?.response?.text?.());
  } catch (e) {
    console.error('AI test failed:', e.message);
  }
} else {
  console.log('No API key found');
}