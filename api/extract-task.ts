/**
 * Vercel Serverless Function for AI Task Extraction
 * Proxies requests to Groq API to keep API key secure
 *
 * To deploy:
 * 1. Configure GROQ_API_KEY in Vercel environment variables
 * 2. Configure GROQ_MODEL (optional, defaults to llama-3.3-70b-versatile)
 * 3. This function will be available at /api/extract-task
 */

import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { input } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Groq API key not configured' });
    }

    const model = process.env.GROQ_MODEL || 'qwen-2.5-32b';

    const prompt = `Extract structured task information from the following text. Return only valid JSON with these fields:
- title: short task title
- description: detailed description
- deadline: YYYY-MM-DD format if present
- priority: one of "low", "medium", "high", "critical"
- estimatedEffort: number of days
- dependencies: array of task codes if mentioned
- tags: array of relevant keywords
- projectId: project code if mentioned

Text: "${input}"

Return JSON only, no markdown, no explanations.`;

    const endpoint = 'https://api.groq.com/openai/v1/chat/completions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', errorText);
      return res.status(response.status).json({ error: `AI API error: ${response.status}`, details: errorText });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '{}';

    // Parse and validate JSON
    try {
      const parsed = JSON.parse(text);
      return res.status(200).json({ success: true, data: parsed });
    } catch {
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }
  } catch (error) {
    console.error('Extraction function error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
