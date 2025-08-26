// ✅ Cloudflare Worker - FINAL (No 500 Errors)
const ALLOWED_ORIGINS = ['https://nexusrank.pages.dev', 'http://localhost:5000'];

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

function handleOptions(request) {
  const cors = getCorsHeaders(request);
  cors['Access-Control-Allow-Headers'] = 'Content-Type';
  return new Response(null, { status: 204, headers: cors });
}

const DEEPSEEK_API = 'https://api.deepseek.com/v1/chat/completions';

const TOOL_CONFIGS = {
  '/ai/seo-write': {
    system: 'Write a 2000-5000 word SEO-optimized article with H2/H3, bullet points, natural keywords, and human tone.',
    max: 8192, temp: 0.7
  },
  '/ai/humanize': {
    system: 'Make this sound 100% human. Add contractions, imperfections, and conversational flow.',
    max: 4000, temp: 0.8
  },
  '/ai/detect': {
    system: 'Analyze this text and estimate AI probability. Respond with: "AI Probability: X%" and a 2-sentence explanation.',
    max: 1000, temp: 0.3
  },
  '/ai/paraphrase': {
    system: 'Rewrite to be 100% unique and undetectable as AI. Keep meaning but change structure.',
    max: 4000, temp: 0.6
  },
  '/ai/grammar': {
    system: 'Fix all grammar, spelling, and punctuation errors. Return only the corrected version.',
    max: 4000, temp: 0.2
  },
  '/ai/improve': {
    system: 'Improve this text for clarity, fluency, and professionalism.',
    max: 4000, temp: 0.5
  }
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') return handleOptions(request);
    if (request.method !== 'POST') return new Response('Method not allowed', {
      status: 405,
      headers: getCorsHeaders(request)
    });

    const config = TOOL_CONFIGS[pathname];
    if (!config) return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: getCorsHeaders(request)
    });

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
    if (!text || typeof text !== 'string' || !text.trim()) {
      return new Response(JSON.stringify({ error: 'Text required' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    const key = env.DEEPSEEK_API_KEY;
    if (!key) {
      console.error('DEEPSEEK_API_KEY missing');
      return new Response(JSON.stringify({ error: 'AI service configuration error' }), {
        status: 500,
        headers: getCorsHeaders(request)
      });
    }

    try {
      const res = await fetch(DEEPSEEK_API, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: config.system },
            { role: 'user', content: text }
          ],
          max_tokens: config.max,
          temperature: config.temp
        })
      });

      if (!res.ok) return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
        status: 503,
        headers: getCorsHeaders(request)
      });

      const result = await res.json();
      const content = result.choices?.[0]?.message?.content?.trim();

      if (!content) {
        return new Response(JSON.stringify({ error: 'Empty response' }), {
          status: 500,
          headers: getCorsHeaders(request)
        });
      }

      return new Response(JSON.stringify({
        success: true,
        content,
        tool: pathname.split('/').pop(),
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
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: getCorsHeaders(request)
      });
    }
  }
};
