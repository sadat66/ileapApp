# Vercel Edge Requests & Function Invocations Analysis

## Current Configuration

### Runtime Type
- **Current**: Node.js Serverless Functions (`@vercel/node`)
- **Location**: `vercel.json` → `"use": "@vercel/node"`
- **Entry Point**: `api/index.ts`

### Function Structure
```
All requests → api/index.ts → Express App (server/index.ts)
```

### Current Setup Details

**vercel.json:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.ts"
    }
  ]
}
```

**Function Handler** (`api/index.ts`):
- Exports Express app as default
- All routes handled by single serverless function
- Uses Node.js runtime (not Edge)

## Edge Runtime vs Node.js Runtime

### Current: Node.js Runtime (`@vercel/node`)
**Pros:**
- ✅ Full Node.js API support
- ✅ Can use all npm packages
- ✅ Works with Express, Mongoose, etc.
- ✅ Better for complex backend logic

**Cons:**
- ❌ Slower cold starts (~100-500ms)
- ❌ Higher latency
- ❌ More expensive (compute time)
- ❌ 10-second timeout (free tier)

### Edge Runtime (`@vercel/edge`)
**Pros:**
- ✅ Ultra-fast cold starts (~0-50ms)
- ✅ Lower latency (runs at edge locations)
- ✅ Better for simple API routes
- ✅ Lower cost

**Cons:**
- ❌ Limited Node.js API support
- ❌ Cannot use many npm packages (no native modules)
- ❌ Cannot use Express, Mongoose directly
- ❌ Limited to Web APIs (Request/Response)
- ❌ 25-second timeout (free tier)

## Function Invocation Monitoring

### How to Check Function Invocations in Vercel

1. **Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Select your project: `ileapbackend`
   - Navigate to **Analytics** tab
   - View:
     - Function invocations count
     - Execution time
     - Error rate
     - Cold start metrics

2. **Vercel CLI:**
   ```bash
   vercel logs
   vercel inspect
   ```

3. **Real-time Monitoring:**
   - Go to project → **Functions** tab
   - See real-time invocations
   - View logs per function

### Current Function Invocation Pattern

**Single Function:**
- **Name**: `api/index.ts`
- **Type**: Node.js Serverless Function
- **Routes**: All routes (`/(.*)`)
- **Pattern**: Monolithic (one function handles everything)

**Impact:**
- Every request invokes the same function
- Cold starts affect all routes
- No route-specific optimization

## Recommendations

### Option 1: Keep Current Setup (Recommended for Now)
**Best if:**
- You need Express, Mongoose, and full Node.js features
- Your API is working well
- You're not hitting cold start issues

**Monitoring:**
- Check Vercel dashboard for invocation metrics
- Monitor cold start frequency
- Track execution time per route

### Option 2: Hybrid Approach (Best Performance)
**Split into:**
- **Edge Functions** for simple routes (health checks, static responses)
- **Node.js Functions** for complex routes (auth, database operations)

**Example Structure:**
```
api/
  ├── health.ts          (Edge - simple response)
  ├── auth/
  │   └── signin.ts      (Node.js - needs database)
  └── messages/
      └── index.ts       (Node.js - needs database)
```

### Option 3: Convert to Edge Runtime (Not Recommended)
**Only if:**
- You rewrite to use Web APIs only
- You replace Mongoose with edge-compatible DB client
- You remove Express and use native Request/Response

**This would require significant refactoring.**

## Current Function Invocation Metrics

To check your actual metrics:

1. **Vercel Dashboard** → Your Project → **Analytics**
   - Total invocations
   - Average execution time
   - Cold start percentage
   - Error rate

2. **Functions Tab** → View individual function stats

3. **Logs Tab** → Real-time function execution logs

## Next Steps

1. **Check Vercel Dashboard** for current invocation metrics
2. **Identify high-traffic routes** that could benefit from Edge
3. **Consider splitting** simple routes to Edge functions
4. **Monitor cold starts** - if frequent, consider Edge for health checks

## Edge Function Example (If Needed)

If you want to add an Edge function for health checks:

**api/health.ts:**
```typescript
export const config = {
  runtime: 'edge',
};

export default function handler(req: Request) {
  return new Response(
    JSON.stringify({ status: 'ok', runtime: 'edge' }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
```

**Update vercel.json:**
```json
{
  "routes": [
    {
      "src": "/health",
      "dest": "/api/health.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/api/index.ts"
    }
  ]
}
```

---

**Last Updated**: Analysis of current Vercel configuration
**Project**: ileapbackend (prj_hXrX0tppXLqoYiDh2GmpnvtmsOOU)



