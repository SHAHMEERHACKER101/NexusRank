/**
 * NexusRank Pro - FINAL Worker
 * DeepSeek-powered, no Gemini, no false claims
 * Fully compliant, debug-ready, CORS-safe
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

// ✅ DeepSeek API URL
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// ✅ Tool configurations with DETAILED 3-4 line prompts
const TOOL_CONFIGS = {
  '/ai/seo-write': {
    system: `You are an expert SEO content strategist. Create comprehensive, high-quality articles that provide real value to readers and follow Google's E-E-A-T guidelines.

Write in a natural, conversational tone with varied sentence structure. Use proper H2 and H3 headings, bullet points, and short paragraphs to enhance readability.

Incorporate relevant keywords naturally—do not keyword stuff. Focus on user intent, content depth, and semantic structure.

Your goal is to produce original, engaging content that ranks well and genuinely helps users—without sounding robotic or formulaic.`
  },
  '/ai/humanize': {
    system: `Transform AI-generated text into natural, human-like writing. Add contractions, slight imperfections, and conversational flow to mimic real human patterns.

Vary sentence length and structure. Use casual transitions and personal tone where appropriate. Avoid overly formal or repetitive language.

Preserve the original meaning and key information while making the text sound authentic and relatable.

The result should be indistinguishable from content written by a skilled human writer.`
  },
  '/ai/detect': {
    system: `Analyze the provided text for patterns commonly associated with AI generation. Look for uniform sentence length, repetitive phrasing, lack of personal voice, and overuse of transitional words.

Provide a balanced assessment of AI likelihood based on linguistic and structural indicators. Avoid absolute statements—focus on probabilities and observable patterns.

Respond with: "AI Probability: X%" followed by a concise 2-sentence explanation of your reasoning.

Your analysis should be informative, not alarmist, and help users understand the nature of the content.`
  },
  '/ai/paraphrase': {
    system: `Rewrite the text to be completely original while preserving the core meaning and intent. Use different vocabulary, sentence structures, and phrasing to create a fresh version.

Avoid simple synonym replacement. Focus on rephrasing ideas in a new way while maintaining clarity and accuracy.

Ensure the output is natural, readable, and suitable for content creators who need unique versions of existing material.

Do not add or remove key information—only restructure and reword for originality.`
  },
  '/ai/grammar': {
    system: `Review the text and correct all grammar, spelling, punctuation, and capitalization errors. Fix subject-verb agreement, tense consistency, and word usage mistakes.

Return only the corrected version—do not include explanations unless the context is ambiguous.

Preserve the original tone, style, and formatting while improving technical accuracy.

The final text should be polished, professional, and free of mechanical errors.`
  },
  '/ai/improve': {
    system: `Enhance the text for clarity, fluency, and overall effectiveness. Improve sentence flow, word choice, and paragraph structure to make it more engaging.

Simplify complex sentences, eliminate redundancy, and strengthen weak transitions. Ensure the message is clear and impactful.

Maintain the original intent and voice while elevating the quality of writing.

Focus on readability, coherence, and audience engagement.`
  }
};

// ✅ Tool-specific settings
const TOOL_SETTINGS = {
  'seo-write': { max_tokens: 8192, temperature: 0.7 },
  'humanize': { max_tokens: 4000, temperature: 0.8 },
  'detect': { max_tokens: 1000, temperature: 0.3 },
  'paraphrase': { max_tokens: 4000, temperature: 0.6 },
  'grammar': { max_tokens: 4000, temperature: 0.2 },
  'improve': { max_tokens: 4000, temperature: 0.5 }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    console.log('[DEBUG] 🚀 Worker started:', { method: request.method, path });

    // ✅ Handle CORS preflight
    if (request.method === 'OPTIONS') return handleOptions(request);

    // ✅ Validate POST
    if (request.method !== 'POST') {
      console.log('[DEBUG] ❌ Method not allowed');
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: getCorsHeaders(request)
      });
    }

    // ✅ Check if endpoint exists
    const config = TOOL_CONFIGS[path];
    if (!config) {
      console.log('[DEBUG] ❌ Endpoint not found:', path);
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
      console.log('[DEBUG] 📄 Request body parsed');
    } catch (e) {
      console.error('[DEBUG] 🚨 Invalid JSON:', e.message);
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    const text = data.text || '';
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      console.log('[DEBUG] ❌ Missing or invalid text input');
      return new Response(JSON.stringify({ error: 'Text input is required' }), {
        status: 400,
        headers: getCorsHeaders(request)
      });
    }

    // ✅ Get API key
    const apiKey = env.DEEPSEEK_API_KEY;
    console.log('[DEBUG] 🔑 DEEPSEEK_API_KEY exists:', !!apiKey);
    if (!apiKey) {
      console.error('[DEBUG] 🚨 FATAL: DEEPSEEK_API_KEY is MISSING or NOT ENCRYPTED');
      return new Response(JSON.stringify({ error: 'AI service configuration error' }), {
        status: 500,
        headers: getCorsHeaders(request)
      });
    }

    // ✅ Get tool name
    const toolName = path.split('/').pop();
    const settings = TOOL_SETTINGS[toolName] || { max_tokens: 4000, temperature: 0.5 };

    try {
      // ✅ Call DeepSeek API
      console.log('[DEBUG] 🌐 Calling DeepSeek API...');
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
          max_tokens: settings.max_tokens,
          temperature: settings.temperature,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] 🚨 DeepSeek API error:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
          status: 503,
          headers: getCorsHeaders(request)
        });
      }

      const result = await response.json();
      const aiText = result.choices?.[0]?.message?.content?.trim();

      if (!aiText) {
        console.error('[DEBUG] 🚫 Empty AI response:', result);
        return new Response(JSON.stringify({ error: 'Empty AI response' }), {
          status: 500,
          headers: getCorsHeaders(request)
        });
      }

      // ✅ Success!
      console.log('[DEBUG] ✅ AI processing successful');
      return new Response(JSON.stringify({
        success: true,
        content: aiText,
        tool: toolName,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: {
          ...getCorsHeaders(request),
          'Content-Type': 'application/json'
        }
      });

    } catch (error) {
      console.error('[DEBUG] 🚨 Unexpected error:', error);
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: getCorsHeaders(request)
      });
    }
  }
};
