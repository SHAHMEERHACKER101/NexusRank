/**
 * NexusRank Pro - FINAL Worker with Debug Logs
 * Use this to identify the real issue
 */

// ✅ Allowed origins
const ALLOWED_ORIGINS = [
  'https://nexusrank.pages.dev',
  'http://localhost:5000'
];

// ✅ CORS headers
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

// ✅ Tool configurations
const TOOL_CONFIGS = {
  '/ai/seo-write': {
    system: 'Write a 2000-5000 word SEO-optimized article. Use H2/H3, bullet points, natural keywords, and human tone.',
    max_tokens: 8192,
    temperature: 0.7
  },
  '/ai/humanize': {
    system: 'Make this sound 100% human. Add contractions, imperfections, and conversational flow.',
    max_tokens: 4000,
    temperature: 0.8
  },
  '/ai/detect': {
    system: 'Analyze this text and estimate AI probability. Respond with: "AI Probability: X%" and a 2-sentence explanation.',
    max_tokens: 1000,
    temperature: 0.3
  },
  '/ai/paraphrase': {
    system: 'Rewrite to be 100% unique and undetectable as AI. Keep meaning but change structure.',
    max_tokens: 4000,
    temperature: 0.6
  },
  '/ai/grammar': {
    system: 'Fix all grammar, spelling, and punctuation errors. Return only the corrected version.',
    max_tokens: 4000,
    temperature: 0.2
  },
  '/ai/improve': {
    system: 'Improve this text for clarity, fluency, and professionalism.',
    max_tokens: 4000,
    temperature: 0.5
  }
};

export default {
  async fetch(request, env) {
    console.log('[DEBUG] Worker started');

    const url = new URL(request.url);
    const path = url.pathname;

    // ✅ Log incoming request
    console.log('[DEBUG] Incoming request:', {
      method: request.method,
      path,
      origin: request.headers.get('Origin'),
      userAgent: request.headers.get('User-Agent')
    });

    // ✅ Handle CORS preflight
    if (request.method === 'OPTIONS') {
      console.log('[DEBUG] Handling OPTIONS request');
      return handleOptions(request);
    }

    // ✅ Validate POST
    if (request.method !== 'POST') {
      console.log('[DEBUG] Method not allowed:', request.method);
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: getCorsHeaders(request)
      });
    }

    // ✅ Check if endpoint exists
    const config = TOOL_CONFIGS[path];
    if (!config) {
      console.log('[DEBUG] Endpoint not found:', path);
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
      console.log('[DEBUG] Parsed request body:', { textLength: data.text?.length });
    } catch (e) {
      console.error('[DEBUG] Failed to parse JSON:', e.message);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    const text = data.text || '';
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.log('[DEBUG] Invalid or missing text input');
      return new Response(JSON.stringify({ error: 'Text input is required' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    // ✅ Get API key
    const apiKey = env.DEEPSEEK_API_KEY;
    console.log('[DEBUG] DEEPSEEK_API_KEY exists:', !!apiKey);
    if (apiKey) {
      console.log('[DEBUG] API Key first 4 chars:', apiKey.substring(0, 4));
    } else {
      console.error('[DEBUG] FATAL: DEEPSEEK_API_KEY is MISSING or NOT ENCRYPTED');
      return new Response(JSON.stringify({ error: 'AI service configuration error' }), {
        status: 500,
        headers: getCorsHeaders(request)
      });
    }

    try {
      // ✅ Call DeepSeek API
      console.log('[DEBUG] Calling DeepSeek API...');
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
          top_p: 0.9
        })
      });

      console.log('[DEBUG] DeepSeek API response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] DeepSeek API error:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
          status: 503,
          headers: getCorsHeaders(request)
        });
      }

      const result = await response.json();
      console.log('[DEBUG] DeepSeek API response:', {
        choicesLength: result.choices?.length,
        contentLength: result.choices?.[0]?.message?.content?.length
      });

      const aiText = result.choices?.[0]?.message?.content?.trim();

      if (!aiText) {
        console.error('[DEBUG] Empty AI response:', result);
        return new Response(JSON.stringify({ error: 'Empty AI response' }), {
          status: 500,
          headers: getCorsHeaders(request)
        });
      }

      // ✅ Success!
      console.log('[DEBUG] AI processing successful');
      return new Response(JSON.stringify({
        success: true,
        content: aiText,
        tool: path.split('/').pop(),
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: {
          ...getCorsHeaders(request),
          'Content-Type': 'application/json'
        }
      });

    } catch (error) {
      console.error('[DEBUG] Worker error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: getCorsHeaders(request)
      });
    }
  }
};
