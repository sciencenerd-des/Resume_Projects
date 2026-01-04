/**
 * Rate Limiting Middleware
 * Token bucket algorithm for API rate limiting
 */

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  refillInterval: number; // ms
}

// Default configs for different endpoint types
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: {
    maxTokens: 100,
    refillRate: 10,
    refillInterval: 1000,
  },
  query: {
    maxTokens: 20,
    refillRate: 2,
    refillInterval: 1000,
  },
  upload: {
    maxTokens: 10,
    refillRate: 1,
    refillInterval: 1000,
  },
  auth: {
    maxTokens: 5,
    refillRate: 1,
    refillInterval: 5000,
  },
};

// In-memory store for rate limit buckets
const buckets = new Map<string, RateLimitBucket>();

/**
 * Get bucket key from request
 */
function getBucketKey(request: Request, userId?: string): string {
  // Use user ID if authenticated, otherwise fall back to IP
  if (userId) {
    return `user:${userId}`;
  }

  // Extract IP from headers (respects X-Forwarded-For for proxies)
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0].trim() || "unknown";
  return `ip:${ip}`;
}

/**
 * Get or create bucket for a key
 */
function getOrCreateBucket(
  key: string,
  config: RateLimitConfig
): RateLimitBucket {
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = {
      tokens: config.maxTokens,
      lastRefill: Date.now(),
    };
    buckets.set(key, bucket);
  }

  return bucket;
}

/**
 * Refill bucket tokens based on time elapsed
 */
function refillBucket(bucket: RateLimitBucket, config: RateLimitConfig): void {
  const now = Date.now();
  const elapsed = now - bucket.lastRefill;
  const refills = Math.floor(elapsed / config.refillInterval);

  if (refills > 0) {
    bucket.tokens = Math.min(
      config.maxTokens,
      bucket.tokens + refills * config.refillRate
    );
    bucket.lastRefill = now;
  }
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  request: Request,
  endpointType: keyof typeof RATE_LIMITS = "default",
  userId?: string
): { allowed: boolean; remaining: number; resetIn: number } {
  const config = RATE_LIMITS[endpointType] || RATE_LIMITS.default;
  const key = `${endpointType}:${getBucketKey(request, userId)}`;
  const bucket = getOrCreateBucket(key, config);

  // Refill tokens
  refillBucket(bucket, config);

  // Check if request is allowed
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetIn: config.refillInterval,
    };
  }

  // Calculate time until next token
  const resetIn = config.refillInterval - (Date.now() - bucket.lastRefill);

  return {
    allowed: false,
    remaining: 0,
    resetIn: Math.max(0, resetIn),
  };
}

/**
 * Rate limit middleware wrapper
 */
export function rateLimit(
  endpointType: keyof typeof RATE_LIMITS = "default"
): (
  handler: (request: Request, userId?: string) => Promise<Response>
) => (request: Request, userId?: string) => Promise<Response> {
  return (handler) => async (request, userId) => {
    const result = checkRateLimit(request, endpointType, userId);

    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please try again later.",
            retryAfter: Math.ceil(result.resetIn / 1000),
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": result.resetIn.toString(),
            "Retry-After": Math.ceil(result.resetIn / 1000).toString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(request, userId);

    // Clone response to add headers
    const newHeaders = new Headers(response.headers);
    newHeaders.set("X-RateLimit-Remaining", result.remaining.toString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  };
}

/**
 * Clean up old buckets (call periodically)
 */
export function cleanupBuckets(maxAge: number = 3600000): void {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > maxAge) {
      buckets.delete(key);
    }
  }
}

// Cleanup every hour
setInterval(() => cleanupBuckets(), 3600000);
