import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = express.Router();

// Sign in
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email }).populate('organization_profile');
    
    if (!user) {
      console.log('Login attempt failed: User not found for email:', email);
      return res.status(404).json({ error: 'User not found. Please sign up first.' });
    }

    console.log('Login attempt for user:', {
      email: user.email,
      role: user.role,
      is_verified: user.is_verified,
      has_password: !!user.password,
    });

    if (!user.is_verified) {
      console.log('Login attempt failed: Email not verified for:', email);
      return res.status(400).json({ error: 'Please verify your email first!' });
    }

    if (!user.password) {
      console.log('Login attempt failed: No password set for:', email);
      return res.status(400).json({ error: 'Invalid authentication method' });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      console.log('Login attempt failed: Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Update last seen
    user.last_seen = new Date();
    await user.save();

    console.log('Login successful for user:', {
      email: user.email,
      role: user.role,
      id: user._id.toString(),
    });

    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role || null,
        image: user.image,
        organization_profile: user.organization_profile,
      },
    });
  } catch (error: any) {
    console.error('Sign in error:', error);
    res.status(500).json({ error: error.message || 'Sign in failed' });
  }
});

// Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not set');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate('organization_profile');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role || null,
      image: user.image,
      organization_profile: user.organization_profile,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export default router;

