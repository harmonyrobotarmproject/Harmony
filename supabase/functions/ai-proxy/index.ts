// ===== Harmony AI Proxy Edge Function =====
// Proxies AI requests to Azure OpenAI or GitHub Models
// Keeps API keys secure on server side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyJwt } from '../_shared/auth.ts';
import { rateLimit } from '../_shared/rate-limit.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')!;
const azureApiKey = Deno.env.get('AZURE_OPENAI_API_KEY')!;
const azureDeployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT') || 'gpt-5.4-mini';
const azureApiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2024-02-15-preview';
const githubToken = Deno.env.get('GITHUB_TOKEN') || '';

const limiter = rateLimit({ maxRequests: 20, windowMs: 60000, keyPrefix: 'ai-proxy' });

interface AIRequest {
  provider: 'azure' | 'github';
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

serve(async (req: Request) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Verify JWT
  const { user, error: authError } = await verifyJwt(req, supabaseUrl, supabaseServiceKey);
  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), {
      status: authError.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Rate limiting
  const rlResult = await limiter(req, user.id);
  if (!rlResult.allowed) {
    return new Response(JSON.stringify({ 
      error: 'Rate limit exceeded. Please wait before making more requests.',
      retryAfter: Math.ceil((rlResult.resetTime - Date.now()) / 1000)
    }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((rlResult.resetTime - Date.now()) / 1000)) }
    });
  }

  try {
    const body: AIRequest = await req.json();
    const { provider, model, messages, temperature = 0.3, max_tokens = 2000 } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let result;

    if (provider === 'azure') {
      result = await callAzureOpenAI(messages, temperature, max_tokens);
    } else if (provider === 'github') {
      result = await callGitHubModels(messages, temperature, max_tokens);
    } else {
      return new Response(JSON.stringify({ error: 'Invalid provider. Use "azure" or "github"' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('AI Proxy error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function callAzureOpenAI(messages: any[], temperature: number, maxTokens: number) {
  const url = `${azureEndpoint}/openai/deployments/${azureDeployment}/chat/completions?api-version=${azureApiVersion}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': azureApiKey,
    },
    body: JSON.stringify({
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: 0.95,
      frequency_penalty: 0,
      presence_penalty: 0,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure OpenAI error (${response.status}): ${error}`);
  }

  return response.json();
}

async function callGitHubModels(messages: any[], temperature: number, maxTokens: number) {
  if (!githubToken) {
    throw new Error('GitHub Models not configured. Set GITHUB_TOKEN secret.');
  }

  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${githubToken}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub Models error (${response.status}): ${error}`);
  }

  return response.json();
}