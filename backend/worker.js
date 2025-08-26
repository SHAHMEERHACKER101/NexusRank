/**
 * Cloudflare Worker for NexusRank AI Tools
 * Handles API requests to DeepSeek AI service
 */

// CORS headers for browser requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Tool configurations with DeepSeek prompts
const TOOL_CONFIGS = {
  'seo-writer': {
    systemPrompt: `You are an expert SEO content writer. Create comprehensive, search-engine optimized articles that rank well on Google. Your writing should be:

- 5000+ words when possible
- Include proper H2 and H3 headings structure
- Use bullet points and numbered lists
- Include relevant keywords naturally
- Write in an engaging, informative style
- Add meta descriptions suggestions
- Include FAQ sections when relevant
- Use semantic HTML structure in mind
- Write for humans first, search engines second

Focus on providing value and answering user intent completely.`,
    userPromptTemplate: (text) => `Write a comprehensive, SEO-optimized article about: "${text}". Include proper headings (H2, H3), bullet points, and make it at least 3000 words. Structure it with introduction, main sections, and conclusion. Include relevant keywords naturally throughout the content.`
  },
  
  'humanizer': {
    systemPrompt: `You are an expert at making AI-generated text sound more human and natural. Transform the given text to:

- Add natural contractions (I'll, don't, can't, etc.)
- Vary sentence length and structure
- Include conversational elements and transitions
- Add subtle imperfections that humans naturally have
- Use more relatable language and examples
- Include personal touches and casual expressions
- Make the tone more authentic and engaging
- Preserve the original meaning and key information
- Remove overly formal or robotic language patterns

The result should sound like it was written by a real person, not an AI.`,
    userPromptTemplate: (text) => `Please humanize this text to make it sound more natural and conversational while keeping the same meaning and information: "${text}"`
  },
  
  'detector': {
    systemPrompt: `You are an AI content detection expert. Analyze the given text and provide:

1. AI Probability: A percentage (0-100%) likelihood the text was AI-generated
2. Reasoning: Detailed explanation of your analysis
3. Specific indicators: What patterns suggest AI or human writing
4. Confidence level: How certain you are about your assessment

Look for patterns like:
- Repetitive sentence structures
- Overly formal language
- Perfect grammar with no natural errors
- Generic transitions and phrases
- Lack of personal anecdotes or unique perspectives
- Predictable word choices
- Uniform sentence complexity

Provide a balanced, analytical assessment.`,
    userPromptTemplate: (text) => `Analyze this text and determine if it was likely written by AI or a human. Provide a probability percentage and detailed reasoning: "${text}"`
  },
  
  'paraphraser': {
    systemPrompt: `You are an expert at paraphrasing and rewriting content. Your task is to:

- Completely rewrite the text while preserving the original meaning
- Use different vocabulary and sentence structures
- Maintain the same tone and style intent
- Ensure the rewritten version is unique and plagiarism-free
- Keep all important information and details
- Make the text flow naturally
- Use synonyms and alternative expressions
- Restructure paragraphs and sentences creatively
- Maintain readability and clarity

The output should be completely original while conveying the same message.`,
    userPromptTemplate: (text) => `Please paraphrase and rewrite this text completely while keeping the same meaning and information. Make it unique and original: "${text}"`
  },
  
  'grammar': {
    systemPrompt: `You are an expert grammar checker and editor. Your task is to:

- Fix all grammar, spelling, and punctuation errors
- Improve sentence structure and clarity
- Correct word usage and vocabulary mistakes
- Fix verb tenses and subject-verb agreement
- Improve punctuation and capitalization
- Enhance readability and flow
- Maintain the original meaning and style
- Provide clear, error-free text
- Make the writing more professional and polished

Return only the corrected text without explanations unless errors are complex.`,
    userPromptTemplate: (text) => `Please check and correct all grammar, spelling, and punctuation errors in this text. Improve clarity and readability while maintaining the original meaning: "${text}"`
  },
  
  'improver': {
    systemPrompt: `You are an expert writing coach and editor. Your task is to enhance text for:

- Clarity and readability
- Professional tone and style
- Better word choice and vocabulary
- Improved sentence flow and structure
- Enhanced engagement and impact
- Stronger transitions between ideas
- More compelling and persuasive language
- Better organization and logical flow
- Elimination of redundancy and wordiness
- Overall professional polish

Transform the text into its best possible version while maintaining the core message.`,
    userPromptTemplate: (text) => `Please improve this text to make it clearer, more professional, and more engaging. Enhance the writing quality while keeping the same meaning: "${text}"`
  }
};

/**
 * Main request handler
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

/**
 * Handle incoming requests
 */
async function handleRequest(request) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route AI tool requests
    if (path.startsWith('/ai/')) {
      return await handleAIRequest(request, path);
    }

    // Health check endpoint
    if (path === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString() 
      }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Default response for unmatched routes
    return new Response(JSON.stringify({ 
      error: 'Not Found',
      message: 'The requested endpoint does not exist'
    }), {
      status: 404,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Worker error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * Handle AI tool requests
 */
async function handleAIRequest(request, path) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method Not Allowed',
      message: 'Only POST requests are supported'
    }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    // Parse request body
    const body = await request.json();
    const { text, tool } = body;

    // Validate input
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ 
        error: 'Bad Request',
        message: 'Text field is required and must be a string'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    if (text.length > 5000) {
      return new Response(JSON.stringify({ 
        error: 'Bad Request',
        message: 'Text exceeds maximum length of 5000 characters'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Determine tool from path
    const toolName = path.replace('/ai/', '').replace('-write', '-writer');
    const toolConfig = TOOL_CONFIGS[toolName];

    if (!toolConfig) {
      return new Response(JSON.stringify({ 
        error: 'Bad Request',
        message: `Unknown tool: ${toolName}`
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Process with DeepSeek API
    const result = await processWithDeepSeek(text, toolConfig);

    return new Response(JSON.stringify({ 
      result,
      tool: toolName,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('AI processing error:', error);
    
    // Handle specific API errors
    if (error.message.includes('API key')) {
      return new Response(JSON.stringify({ 
        error: 'Service Configuration Error',
        message: 'AI service is temporarily unavailable'
      }), {
        status: 503,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    return new Response(JSON.stringify({ 
      error: 'Processing Error',
      message: 'Failed to process your request. Please try again.'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
}

/**
 * Process text with DeepSeek API
 */
async function processWithDeepSeek(text, toolConfig) {
  const apiKey = DEEPSEEK_API_KEY; // This will be set as an environment variable
  
  if (!apiKey) {
    throw new Error('API key not configured');
  }

  const { systemPrompt, userPromptTemplate } = toolConfig;
  const userPrompt = userPromptTemplate(text);

  const requestBody = {
    model: "deepseek-chat",
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user", 
        content: userPrompt
      }
    ],
    max_tokens: 4000,
    temperature: 0.7,
    top_p: 0.9,
    stream: false
  };

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('DeepSeek API error:', response.status, errorData);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from DeepSeek API');
    }

    return data.choices[0].message.content.trim();

  } catch (error) {
    console.error('DeepSeek processing error:', error);
    throw error;
  }
}

/**
 * Rate limiting helper (basic implementation)
 */
function isRateLimited(request) {
  // Basic rate limiting - can be enhanced with Cloudflare KV storage
  // For now, we'll rely on Cloudflare's built-in DDoS protection
  return false;
}

/**
 * Input sanitization helper
 */
function sanitizeInput(text) {
  if (typeof text !== 'string') {
    return '';
  }
  
  // Remove potentially harmful content
  return text
    .replace(/[<>]/g, '') // Remove basic HTML
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Request logging helper
 */
function logRequest(request, tool, success) {
  // In production, you might want to log to external service
  const logData = {
    timestamp: new Date().toISOString(),
    tool: tool,
    success: success,
    ip: request.headers.get('CF-Connecting-IP'),
    userAgent: request.headers.get('User-Agent'),
    country: request.headers.get('CF-IPCountry')
  };
  
  console.log('Request log:', JSON.stringify(logData));
}

/**
 * Error response helper
 */
function createErrorResponse(message, status = 400) {
  return new Response(JSON.stringify({ 
    error: 'Error',
    message: message,
    timestamp: new Date().toISOString()
  }), {
    status: status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Success response helper
 */
function createSuccessResponse(data) {
  return new Response(JSON.stringify({
    ...data,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
