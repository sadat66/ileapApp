import express, { Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get available users (volunteers for organizations, admins/mentors for volunteers)
router.get('/available', async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = new Types.ObjectId(req.user!.id);
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const currentUser = await User.findById(currentUserId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build base query
    const baseQuery: any = {
      _id: { $ne: currentUserId },
    };

    // If user is a volunteer, show admins and mentors
    if (currentUser.role === 'volunteer') {
      baseQuery.role = { $in: ['admin', 'mentor'] };
    }
    // If user is an admin, mentor, or organization, show volunteers
    else if (currentUser.role === 'admin' || currentUser.role === 'mentor' || currentUser.role === 'organization') {
      baseQuery.role = 'volunteer';
    } else {
      return res.json({ users: [], total: 0, totalPages: 0 });
    }

    // Add search filter
    if (search) {
      baseQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(baseQuery)
        .select('name email image role')
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(baseQuery),
    ]);

    const totalPages = Math.ceil(total / limit);

    res.json({
      users,
      total,
      totalPages,
      page,
      limit,
    });
  } catch (error: any) {
    console.error('Get available users error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch available users' });
  }
});

export default router;

