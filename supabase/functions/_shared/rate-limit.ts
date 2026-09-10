// Simple in-memory rate limiting for Edge Functions
// Note: In production, use Redis or Supabase for distributed rate limiting

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs, keyPrefix = 'rl' } = config;
  
  return async (req: Request, identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> => {
    const key = `${keyPrefix}:${identifier}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    
    if (!entry || now > entry.resetTime) {
      // First request or window expired
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
    }
    
    if (entry.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }
    
    entry.count++;
    return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime };
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute