# Vercel Deployment Guide

This guide will help you deploy the iLeap backend API to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Vercel CLI installed: `npm i -g vercel`
3. MongoDB connection string (MONGODB_URI)
4. Any other environment variables your app needs (JWT_SECRET, etc.)

## Deployment Steps

### 1. Install Vercel CLI (if not already installed)
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Navigate to the project directory
```bash
cd ileapApp
```

### 4. Deploy to Vercel
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? (Select your account)
- Link to existing project? **No** (for first deployment)
- What's your project's name? **ileapbackend** (or your preferred name)
- In which directory is your code located? **./** (current directory)

### 5. Set Environment Variables

After deployment, set your environment variables in Vercel:

**Option A: Via Vercel Dashboard**
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to Settings → Environment Variables
4. Add the following variables:
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Your JWT secret key (if used)
   - `NODE_ENV` - Set to `production`
   - Any other environment variables your app needs

**Option B: Via CLI**
```bash
vercel env add MONGODB_URI
vercel env add JWT_SECRET
vercel env add NODE_ENV production
```

### 6. Redeploy after adding environment variables
```bash
vercel --prod
```

## Project Configuration

The project is configured with:
- **API Handler**: `api/index.ts` - Vercel serverless function
- **Configuration**: `vercel.json` - Vercel deployment settings
- **Production URL**: `https://ileapbackend.vercel.app`

## Mobile App Configuration

The mobile app is already configured to use the production API URL:
- **Development**: Uses local IP address (http://192.168.1.103:3001)
- **Production**: Uses `https://ileapbackend.vercel.app`

You can override this with the `EXPO_PUBLIC_API_URL` environment variable.

## Testing the Deployment

After deployment, test your API:

1. **Health Check**: `https://ileapbackend.vercel.app/health`
2. **API Info**: `https://ileapbackend.vercel.app/api`

## Important Notes

1. **File Uploads**: The current setup uses local file storage. For production, consider using:
   - Vercel Blob Storage
   - AWS S3
   - Cloudinary
   - Other cloud storage solutions

2. **Database**: Ensure your MongoDB Atlas (or other MongoDB instance) allows connections from Vercel's IP addresses.

3. **CORS**: CORS is configured to allow requests from your mobile app. Update the `origin` in `server/index.ts` if needed.

4. **Cold Starts**: Vercel serverless functions may have cold starts. The database connection is initialized when the function is invoked.

## Troubleshooting

### Database Connection Issues
- Verify `MONGODB_URI` is set correctly in Vercel
- Check MongoDB network access settings
- Ensure MongoDB allows connections from anywhere (0.0.0.0/0) or Vercel's IPs

### API Not Responding
- Check Vercel deployment logs
- Verify the `api/index.ts` file exists
- Ensure `vercel.json` is configured correctly

### CORS Errors
- Update CORS origin in `server/index.ts` to include your mobile app's domain
- Check that credentials are properly configured

## Updating the Deployment

To update your deployment:
```bash
vercel --prod
```

Or push to your connected Git repository (if configured).

