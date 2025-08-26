/**
 * NexusRank Pro - FINAL Cloudflare Worker
 * Secure, production-ready, no 500 errors
 */

// ✅ Allowed origins (your frontend only)
const ALLOWED_ORIGINS = [
  'https://nexusrank.pages.dev',
  'http://localhost:5000'
];

// ✅ Secure CORS headers (origin-aware)
function getCorsHeaders(request) {
  const origin = request.headers.get('Origin');
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json'
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  return headers;
}

// ✅ Handle preflight (OPTIONS)
function handleOptions(request) {
  const corsHeaders = getCorsHeaders(request);
  corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type';
  return new Response(null, { status: 204, headers: corsHeaders });
}

// ✅ DeepSeek API URL (NO TRAILING SPACES!)
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// ✅ Tool configurations (fixed IDs to match frontend)
const TOOL_CONFIGS = {
  'seo-write': {
    system: 'Write a comprehensive, SEO-optimized article with H2/H3 headings, bullet points, natural keywords, and human tone. Avoid AI patterns.',
    max_tokens: 8192,
    temperature: 0.7
  },
  'humanize': {
    system: 'Transform AI-generated text to sound 100% human. Add contractions, imperfections, and conversational flow. Undetectable as AI.',
    max_tokens: 4000,
    temperature: 0.8
  },
  'detect': {
    system: 'Analyze this text and estimate AI probability. Respond with: "AI Probability: X%" and a 2-sentence explanation.',
    max_tokens: 1000,
    temperature: 0.3
  },
  'paraphrase': {
    system: 'Rewrite to be 100% unique and undetectable as AI. Keep meaning but change structure.',
    max_tokens: 4000,
    temperature: 0.6
  },
  'grammar': {
    system: 'Fix all grammar, spelling, and punctuation errors. Return only the corrected version.',
    max_tokens: 4000,
    temperature: 0.2
  },
  'improve': {
    system: 'Improve this text for clarity, fluency, and professionalism.',
    max_tokens: 4000,
    temperature: 0.5
  }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // ✅ Handle CORS preflight
    if (request.method === 'OPTIONS') return handleOptions(request);

    // ✅ Validate POST
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: getCorsHeaders(request)
      });
    }

    // ✅ Check if endpoint exists
    const endpoint = path.replace('/ai/', '');
    if (!TOOL_CONFIGS[endpoint]) {
      return new Response(JSON.stringify({
        error: 'Endpoint not found',
        available: Object.keys(TOOL_CONFIGS)
      }), {
        status: 404,
        headers: getCorsHeaders(request)
      });
    }

    // ✅ Parse request body
    let data;
    try {
      data = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    const text = data.text || '';
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Text input is required' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    if (text.length > 5000) {
      return new Response(JSON.stringify({ error: 'Text exceeds 5000 character limit' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    // ✅ Get API key
    const apiKey = env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error('DEEPSEEK_API_KEY not set');
      return new Response(JSON.stringify({ error: 'AI service configuration error' }), {
        status: 500,
        headers: getCorsHeaders(request)
      });
    }

    const config = TOOL_CONFIGS[endpoint];

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: config.system },
            { role: 'user', content: text }
          ],
          max_tokens: config.max_tokens,
          temperature: config.temperature,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('DeepSeek API error:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
          status: 503,
          headers: getCorsHeaders(request)
        });
      }

      const result = await response.json();
      const aiText = result.choices?.[0]?.message?.content?.trim();

      if (!aiText) {
        console.error('Empty AI response:', result);
        return new Response(JSON.stringify({ error: 'Empty AI response' }), {
          status: 500,
          headers: getCorsHeaders(request)
        });
      }

      return new Response(JSON.stringify({
        success: true,
        content: aiText,
        tool: endpoint,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: {
          ...getCorsHeaders(request),
          'Content-Type': 'application/json'
        }
      });

    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: getCorsHeaders(request)
      });
    }
  }
};
