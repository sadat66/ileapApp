import express, { Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Register device token for push notifications
router.post('/register-token', async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = new Types.ObjectId(req.user!.id);
    const { expoPushToken } = req.body;

    if (!expoPushToken) {
      return res.status(400).json({ error: 'Expo push token is required' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Store the push token in user document
    // You might want to add a pushTokens array field to your User model
    // For now, we'll store it in a simple way
    const updatedUser = await User.findByIdAndUpdate(
      currentUserId,
      { $set: { expoPushToken } },
      { new: true } // Return updated document
    );

    console.log(`✅ Push token registered for user: ${user.name || user.email}`);
    console.log(`📱 Token: ${expoPushToken.substring(0, 30)}...`);
    console.log(`💾 Token saved to database: ${updatedUser?.expoPushToken ? 'YES' : 'NO'}`);
    console.log(`🔍 User ID: ${currentUserId.toString()}`);

    res.json({ success: true, message: 'Device token registered successfully' });
  } catch (error: any) {
    console.error('Error registering device token:', error);
    res.status(500).json({ error: error.message || 'Failed to register device token' });
  }
});

// Unregister device token
router.post('/unregister-token', async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = new Types.ObjectId(req.user!.id);

    await User.findByIdAndUpdate(currentUserId, {
      $unset: { expoPushToken: '' },
    });

    res.json({ success: true, message: 'Device token unregistered successfully' });
  } catch (error: any) {
    console.error('Error unregistering device token:', error);
    res.status(500).json({ error: error.message || 'Failed to unregister device token' });
  }
});

// Test push notification - Send a test notification to current user
router.post('/test', async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = new Types.ObjectId(req.user!.id);
    const user = await User.findById(currentUserId).select('expoPushToken name');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.expoPushToken) {
      return res.status(400).json({ 
        error: 'No push token registered for this user',
        message: 'Please log in again to register your push token'
      });
    }

    const { sendPushNotification } = require('../helpers/pushNotifications');
    
    await sendPushNotification(
      user.expoPushToken,
      'Test Notification',
      'This is a test push notification from iLeap!',
      { type: 'test' }
    );

    res.json({ 
      success: true, 
      message: 'Test notification sent',
      token: user.expoPushToken.substring(0, 30) + '...'
    });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: error.message || 'Failed to send test notification' });
  }
});

export default router;

