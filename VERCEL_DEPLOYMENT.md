# Deploying Backend to Vercel

This guide explains how to deploy your Express.js backend to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. MongoDB database (MongoDB Atlas recommended for production)
3. Vercel CLI installed (optional, for CLI deployment)

## Step 1: Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

## Step 2: Configure Environment Variables

Before deploying, you need to set up environment variables in Vercel:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the following variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ileap
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

**Important:** 
- Use MongoDB Atlas connection string for production
- Generate a strong random string for JWT_SECRET
- Never commit these values to git

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. Configure the project:
   - **Framework Preset:** Other
   - **Root Directory:** `ileapApp` (if your repo root is the parent directory)
   - **Build Command:** (leave empty or use `npm install`)
   - **Output Directory:** (leave empty)
5. Add environment variables (from Step 2)
6. Click "Deploy"

### Option B: Deploy via CLI

```bash
cd ileapApp
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? (select your account)
- Link to existing project? **No** (for first deployment)
- Project name? (enter a name or press Enter for default)
- Directory? **./** (current directory)
- Override settings? **No**

## Step 4: Update Mobile App Configuration

After deployment, Vercel will provide you with a URL like:
`https://your-project.vercel.app`

Update your mobile app's API configuration:

1. Open `ileapApp/src/config/constants.ts`
2. Update the `API_BASE_URL`:

```typescript
export const API_BASE_URL = 'https://your-project.vercel.app';
```

Or set it via environment variable:
```bash
EXPO_PUBLIC_API_URL=https://your-project.vercel.app npm start
```

## Step 5: Test the Deployment

1. Visit `https://your-project.vercel.app/health` - should return `{"status":"ok"}`
2. Visit `https://your-project.vercel.app/api` - should return API info
3. Test authentication endpoint from your mobile app

## API Endpoints

Once deployed, your API will be available at:
- `https://your-project.vercel.app/api/auth/signin` - Sign in
- `https://your-project.vercel.app/api/auth/me` - Get current user
- `https://your-project.vercel.app/api/messages/*` - Messaging endpoints
- `https://your-project.vercel.app/api/users/*` - User endpoints
- `https://your-project.vercel.app/api/notifications/*` - Notification endpoints

## Important Notes

### Database Connection
- MongoDB connection is handled automatically
- Connection pooling is configured for serverless environments
- Connections are reused across function invocations

### CORS
- Currently set to allow all origins (`*`)
- For production, consider restricting to your mobile app's domain

### File Uploads
- File uploads are disabled (as requested)
- If you need file uploads later, use cloud storage (AWS S3, Cloudinary, etc.)

### Cold Starts
- First request after inactivity may be slower (cold start)
- Subsequent requests will be faster
- Consider using Vercel Pro for better performance

## Troubleshooting

### "MONGODB_URI is not set"
- Make sure you added the environment variable in Vercel dashboard
- Redeploy after adding environment variables

### "Database connection error"
- Check your MongoDB Atlas connection string
- Ensure your IP is whitelisted in MongoDB Atlas (or allow all IPs for testing)
- Check MongoDB Atlas network access settings

### "Function timeout"
- Vercel free tier has 10-second timeout for serverless functions
- Upgrade to Pro for longer timeouts
- Optimize database queries if needed

### CORS errors
- Check CORS configuration in `server/index.ts`
- Ensure your mobile app is using the correct API URL

## Local Development

For local development, continue using:

```bash
npm run server:dev
```

This runs the server on `http://localhost:3001` and is not affected by Vercel deployment.

## Updating Deployment

After making changes:

1. **Via Git:** Push to your connected repository - Vercel will auto-deploy
2. **Via CLI:** Run `vercel --prod` in the `ileapApp` directory

## Cost

- **Vercel Free Tier:** 
  - 100GB bandwidth/month
  - 100 hours of serverless function execution/month
  - Perfect for development and small apps

- **Vercel Pro:** 
  - $20/month
  - More bandwidth and execution time
  - Better performance and support

