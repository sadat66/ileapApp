# iLeap Mobile API Server

Standalone Express API server for the iLeap mobile app. This server connects directly to the same MongoDB database as the web portal, allowing both applications to share the same data while remaining independent.

## Features

- ✅ **Standalone** - Independent from the web portal
- ✅ **Shared Database** - Uses the same MongoDB database
- ✅ **JWT Authentication** - Token-based auth (not cookies)
- ✅ **Same Credentials** - Users can sign in with web portal credentials
- ✅ **Messaging API** - Full messaging functionality

## Setup

### 1. Environment Variables

Create a `.env` file in the `server` directory:

```env
# MongoDB Connection (same as web portal)
MONGODB_URI=mongodb://localhost:27017/ileap
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ileap

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Port
PORT=3001
```

**Important:** Use the same `MONGODB_URI` as your web portal so both apps share the database.

### 2. Install Dependencies

Dependencies are already installed in the root `package.json`. If needed:

```bash
npm install
```

### 3. Start the Server

```bash
# Development mode (with auto-reload)
npm run server:dev

# Production mode
npm run server
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/signin` - Sign in with email/password
- `GET /api/auth/me` - Get current user (requires auth token)

### Messages

- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/messages/:userId` - Get messages for a conversation
- `POST /api/messages/messages` - Send a message
- `POST /api/messages/conversations/:conversationId/read` - Mark as read
- `GET /api/messages/groups` - Get all groups
- `GET /api/messages/groups/:groupId/messages` - Get group messages
- `POST /api/messages/groups/:groupId/messages` - Send group message

## Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. User signs in with email/password
2. Server returns a JWT token
3. Mobile app stores the token
4. All subsequent requests include: `Authorization: Bearer <token>`

## Database

This server connects to the **same MongoDB database** as the web portal:
- Same users
- Same messages
- Same groups
- Same conversations

Both apps can access the same data independently.

## Architecture

```
┌─────────────┐         ┌─────────────┐
│  Web Portal │         │ Mobile App  │
│  (Next.js)  │         │ (React      │
│  Port 3000  │         │  Native)    │
└──────┬──────┘         └──────┬──────┘
       │                       │
       │                       │
       └───────────┬───────────┘
                   │
            ┌──────▼──────┐
            │   MongoDB   │
            │  Database   │
            └─────────────┘
```

Both applications are independent but share the same database.

## Troubleshooting

### "MONGODB_URI is not set"
- Create a `.env` file in the `server` directory
- Add your MongoDB connection string

### "JWT_SECRET is not set"
- Add `JWT_SECRET` to your `.env` file
- Use a strong random string

### Connection refused
- Make sure MongoDB is running
- Check the connection string is correct
- Verify network/firewall settings

### Port already in use
- Change `PORT` in `.env` to a different port
- Or stop the process using port 3001

