import express, { Response } from 'express';
import { Types } from 'mongoose';
import { Message } from '../models/Message';
import { Group } from '../models/Group';
import { User } from '../models/User';
import { OpportunityMentor } from '../models/OpportunityMentor';
import { authenticate, AuthRequest } from '../middleware/auth';
import { upload, getFileType, getFileUrl } from '../middleware/upload';
import fs from 'fs';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get conversations
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = new Types.ObjectId(req.user!.id);

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: currentUserId },
            { receiver: currentUserId },
          ],
          group: { $exists: false },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', currentUserId] },
              '$receiver',
              '$sender',
            ],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', currentUserId] },
                    { $eq: ['$isRead', false] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            {
              $lookup: {
                from: 'organization_profiles',
                localField: 'organization_profile',
                foreignField: '_id',
                as: 'organization_profile',
              },
            },
            {
              $unwind: {
                path: '$organization_profile',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                name: 1,
                image: 1,
                role: 1,
                organization_profile: { title: 1 },
              },
            },
          ],
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          _id: 1,
          user: 1,
          lastMessage: {
            content: 1,
            isRead: 1,
            createdAt: 1,
          },
          unreadCount: 1,
        },
      },
    ]);

    res.json(conversations);
  } catch (error: any) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch conversations' });
  }
});

// Get messages for a conversation
router.get('/messages/:userId', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;
    const currentUserId = new Types.ObjectId(req.user!.id);
    const otherUserId = new Types.ObjectId(userId);

    const query: any = {
      $or: [
        { sender: currentUserId, receiver: otherUserId },
        { sender: otherUserId, receiver: currentUserId },
      ],
    };

    if (cursor) {
      query._id = { $lt: new Types.ObjectId(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('sender', 'name image role')
      .lean();

    let nextCursor: string | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      if (nextItem && nextItem._id) {
        nextCursor = nextItem._id.toString();
      }
    }

    // Mark messages as read
    await Message.updateMany(
      {
        sender: otherUserId,
        receiver: currentUserId,
        isRead: false,
      },
      {
        $set: { isRead: true },
        $push: {
          readBy: {
            user: currentUserId,
            readAt: new Date(),
          },
        },
      }
    );

    res.json({
      messages: messages.reverse(),
      nextCursor,
    });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch messages' });
  }
});

// Send message (with optional media)
router.post('/messages', upload.single('media'), async (req: AuthRequest, res: Response) => {
  try {
    const { receiverId, content } = req.body;

    if (!receiverId || !content) {
      // If there's a file but no content, allow empty content for media-only messages
      if (!req.file) {
        return res.status(400).json({ error: 'Receiver ID and content are required' });
      }
    }

    const senderId = new Types.ObjectId(req.user!.id);
    const receiverIdObj = new Types.ObjectId(receiverId);

    // Get sender user to check role
    const sender = await User.findById(senderId);
    if (!sender) {
      // Clean up uploaded file if user not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Sender not found' });
    }

    // Check if this is a new conversation (first message)
    const existingMessages = await Message.findOne({
      $or: [
        { sender: senderId, receiver: receiverIdObj },
        { sender: receiverIdObj, receiver: senderId },
      ],
    });

    // Only organizations (and admins) can initiate new conversations
    // Volunteers can only reply to existing conversations
    if (!existingMessages) {
      const canInitiate = sender.role === 'organization' || sender.role === 'admin' || sender.role === 'mentor';
      if (!canInitiate) {
        // Clean up uploaded file if permission denied
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(403).json({ 
          error: 'Only organizations, admins, and mentors can initiate new conversations. Volunteers can only reply to existing conversations.' 
        });
      }
    }

    // Prepare message data
    const messageData: any = {
      sender: senderId,
      receiver: receiverIdObj,
      content: content || (req.file ? `Sent ${req.file.mimetype.startsWith('image/') ? 'an image' : 'a video'}` : ''),
    };

    // Add media if file was uploaded
    if (req.file) {
      messageData.media = {
        url: getFileUrl(req.file.filename),
        type: getFileType(req.file.mimetype),
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        size: req.file.size,
      };
    }

    const message = await Message.create(messageData);

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name image role')
      .lean();

    res.json(populatedMessage);
  } catch (error: any) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// Mark conversation as read
router.post('/conversations/:conversationId/read', async (req: AuthRequest, res: Response) => {
  try {
    const { conversationId } = req.params;
    const currentUserId = new Types.ObjectId(req.user!.id);
    const conversationIdObj = new Types.ObjectId(conversationId);

    const result = await Message.updateMany(
      {
        sender: conversationIdObj,
        receiver: currentUserId,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    res.json({ success: true, updatedCount: result.modifiedCount });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark as read' });
  }
});

// Get groups
router.get('/groups', async (req: AuthRequest, res: Response) => {
  try {
    const currentUserId = new Types.ObjectId(req.user!.id);

    const groups = await Group.find({ members: currentUserId })
      .populate('members', 'name image role')
      .populate('admins', 'name image role')
      .lean();

    const groupsWithMessages = await Promise.all(
      groups.map(async (group: any) => {
        const lastMessage = await Message.findOne({ group: group._id })
          .sort({ createdAt: -1 })
          .populate('sender', 'name image role')
          .lean() as any;

        const unreadCount = await Message.countDocuments({
          group: group._id,
          'readBy.user': { $ne: currentUserId },
          sender: { $ne: currentUserId },
        });

        return {
          ...group,
          opportunityId: group.opportunityId?.toString(),
          lastMessage: lastMessage
            ? {
                content: lastMessage.content,
                isRead: lastMessage.readBy?.some(
                  (read: { user: Types.ObjectId }) =>
                    read.user.toString() === currentUserId.toString()
                ),
                createdAt: lastMessage.createdAt,
              }
            : null,
          unreadCount,
        };
      })
    );

    res.json(groupsWithMessages);
  } catch (error: any) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch groups' });
  }
});

// Get group messages
router.get('/groups/:groupId/messages', async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const cursor = req.query.cursor as string;
    const currentUserId = new Types.ObjectId(req.user!.id);
    const groupIdObj = new Types.ObjectId(groupId);

    const group = await Group.findById(groupIdObj);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (!group.members.includes(currentUserId)) {
      return res.status(403).json({ error: 'You are not a member of this group' });
    }

    const query: any = { group: groupIdObj };
    if (cursor) {
      query._id = { $lt: new Types.ObjectId(cursor) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('sender', 'name image role')
      .lean();

    let nextCursor: string | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      if (nextItem && nextItem._id) {
        nextCursor = nextItem._id.toString();
      }
    }

    // Mark messages as read
    await Message.updateMany(
      {
        group: groupIdObj,
        'readBy.user': { $ne: currentUserId },
      },
      {
        $push: {
          readBy: {
            user: currentUserId,
            readAt: new Date(),
          },
        },
      }
    );

    res.json({
      messages: messages.reverse(),
      nextCursor,
    });
  } catch (error: any) {
    console.error('Get group messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch group messages' });
  }
});

// Send group message (with optional media)
router.post('/groups/:groupId/messages', upload.single('media'), async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { content } = req.body;

    if (!content && !req.file) {
      return res.status(400).json({ error: 'Content or media is required' });
    }

    const currentUserId = new Types.ObjectId(req.user!.id);
    const groupIdObj = new Types.ObjectId(groupId);

    const group = await Group.findOne({ _id: groupIdObj, members: currentUserId });
    if (!group) {
      // Clean up uploaded file if group not found
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Group not found or you are not a member' });
    }

    // Prepare message data
    const messageData: any = {
      sender: currentUserId,
      group: groupIdObj,
      content: content || (req.file ? `Sent ${req.file.mimetype.startsWith('image/') ? 'an image' : 'a video'}` : ''),
      readBy: [{ user: currentUserId }],
    };

    // Add media if file was uploaded
    if (req.file) {
      messageData.media = {
        url: getFileUrl(req.file.filename),
        type: getFileType(req.file.mimetype),
        mimeType: req.file.mimetype,
        fileName: req.file.originalname,
        size: req.file.size,
      };
    }

    const message = await Message.create(messageData);

    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name image role')
      .populate('group', 'name')
      .lean();

    res.json(populatedMessage);
  } catch (error: any) {
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    console.error('Send group message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send group message' });
  }
});

// Create group - Only organizations and admins can create groups
router.post('/groups', async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, memberIds, isOrganizationGroup, opportunityId } = req.body;

    if (!name || !memberIds || !Array.isArray(memberIds)) {
      return res.status(400).json({ error: 'Name and member IDs are required' });
    }

    const currentUserId = new Types.ObjectId(req.user!.id);
    const user = await User.findById(currentUserId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user can create groups
    const canCreateGroups = user.role === 'admin' || user.role === 'organization';
    
    // If user is a volunteer, check if they are assigned as a mentor
    if (!canCreateGroups && user.role === 'volunteer') {
      if (opportunityId) {
        // Check if the user is assigned as a mentor for this specific opportunity
        const mentorAssignment = await OpportunityMentor.findOne({
          volunteer: currentUserId,
          opportunity: new Types.ObjectId(opportunityId),
        });
        
        if (!mentorAssignment) {
          return res.status(403).json({ 
            error: 'You can only create groups for opportunities where you are assigned as a mentor' 
          });
        }
      } else {
        // Check if the user is assigned as a mentor for any opportunity
        const mentorAssignment = await OpportunityMentor.findOne({
          volunteer: currentUserId,
        });
        
        if (!mentorAssignment) {
          return res.status(403).json({ 
            error: 'Volunteers cannot create groups unless they are assigned as mentors' 
          });
        }
      }
    } else if (!canCreateGroups) {
      return res.status(403).json({ 
        error: 'Only organizations and admins can create groups. Volunteers can only create groups if they are assigned as mentors for an opportunity.' 
      });
    }

    // Check if user is an admin when creating an organization group
    if (isOrganizationGroup && user.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Only admins can create organization groups' 
      });
    }

    // Deduplicate member IDs and include creator
    const allMemberIds = [...memberIds.map((id: string) => new Types.ObjectId(id)), currentUserId];
    const uniqueMemberIds = Array.from(
      new Set(allMemberIds.map(id => id.toString()))
    ).map(id => new Types.ObjectId(id));

    // Check which members are mentors for this opportunity (if opportunityId is provided)
    let mentorIds: Types.ObjectId[] = [];
    
    if (opportunityId) {
      const mentorAssignments = await OpportunityMentor.find({
        volunteer: { $in: uniqueMemberIds },
        opportunity: new Types.ObjectId(opportunityId),
      });
      mentorIds = mentorAssignments.map(assignment => assignment.volunteer);
    }
    
    // Creator and mentors are automatically admins
    const adminIds = [...new Set([currentUserId, ...mentorIds])];

    const group = await Group.create({
      name,
      description,
      createdBy: currentUserId,
      members: uniqueMemberIds,
      admins: adminIds,
      isOrganizationGroup: isOrganizationGroup || false,
      opportunityId: opportunityId ? new Types.ObjectId(opportunityId) : undefined,
    });

    const populatedGroup = await Group.findById(group._id)
      .populate('members', 'name image role')
      .populate('admins', 'name image role')
      .lean();

    res.json({
      ...populatedGroup,
      _id: group._id.toString(),
      opportunityId: group.opportunityId?.toString(),
    });
  } catch (error: any) {
    console.error('Create group error:', error);
    res.status(500).json({ error: error.message || 'Failed to create group' });
  }
});

// Update group - Only admins can update
router.put('/groups/:groupId', async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { name, description } = req.body;
    const currentUserId = new Types.ObjectId(req.user!.id);
    const groupIdObj = new Types.ObjectId(groupId);

    const group = await Group.findById(groupIdObj);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions: Allow if user is admin/organization OR if user is admin of the group OR if user is an opportunity mentor OR if user is the group creator
    const isAdminOrOrganization = user.role === 'admin' || user.role === 'organization';
    const isGroupAdmin = group.admins.some((adminId: Types.ObjectId) => adminId.toString() === currentUserId.toString());
    const isGroupCreator = group.createdBy.toString() === currentUserId.toString();
    
    // Check if user is an opportunity mentor for this group's opportunity
    let isOpportunityMentor = false;
    if (group.opportunityId && user.role === 'volunteer') {
      const mentorAssignment = await OpportunityMentor.findOne({
        volunteer: currentUserId,
        opportunity: group.opportunityId,
      });
      isOpportunityMentor = !!mentorAssignment;
    }
    
    if (!isAdminOrOrganization && !isGroupAdmin && !isOpportunityMentor && !isGroupCreator) {
      return res.status(403).json({ error: 'You don\'t have permission to update this group' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const updatedGroup = await Group.findByIdAndUpdate(
      groupIdObj,
      updateData,
      { new: true }
    )
      .populate('members', 'name image role')
      .populate('admins', 'name image role')
      .lean() as any;

    res.json({
      ...updatedGroup,
      _id: updatedGroup._id.toString(),
      opportunityId: updatedGroup.opportunityId?.toString(),
    });
  } catch (error: any) {
    console.error('Update group error:', error);
    res.status(500).json({ error: error.message || 'Failed to update group' });
  }
});

// Add members to group - Only admins can add members
router.post('/groups/:groupId/members', async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ error: 'Member IDs array is required' });
    }

    const currentUserId = new Types.ObjectId(req.user!.id);
    const groupIdObj = new Types.ObjectId(groupId);

    const group = await Group.findById(groupIdObj);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions: Allow if user is admin/organization OR if user is admin of the group OR if user is an opportunity mentor OR if user is the group creator
    const isAdminOrOrganization = user.role === 'admin' || user.role === 'organization';
    const isGroupAdmin = group.admins.some((adminId: Types.ObjectId) => adminId.toString() === currentUserId.toString());
    const isGroupCreator = group.createdBy.toString() === currentUserId.toString();
    
    // Check if user is an opportunity mentor for this group's opportunity
    let isOpportunityMentor = false;
    if (group.opportunityId && user.role === 'volunteer') {
      const mentorAssignment = await OpportunityMentor.findOne({
        volunteer: currentUserId,
        opportunity: group.opportunityId,
      });
      isOpportunityMentor = !!mentorAssignment;
    }
    
    if (!isAdminOrOrganization && !isGroupAdmin && !isOpportunityMentor && !isGroupCreator) {
      return res.status(403).json({ error: 'You don\'t have permission to add members to this group' });
    }

    // Add new members (avoid duplicates)
    const newMemberIds = memberIds.map((id: string) => new Types.ObjectId(id));
    const existingMemberIds = group.members.map((id: Types.ObjectId) => id.toString());
    const uniqueNewMembers = newMemberIds.filter(
      id => !existingMemberIds.includes(id.toString())
    );

    group.members = [...group.members, ...uniqueNewMembers];
    await group.save();

    const updatedGroup = await Group.findById(groupIdObj)
      .populate('members', 'name image role')
      .populate('admins', 'name image role')
      .lean() as any;

    res.json({
      ...updatedGroup,
      _id: updatedGroup._id.toString(),
      opportunityId: updatedGroup.opportunityId?.toString(),
    });
  } catch (error: any) {
    console.error('Add members error:', error);
    res.status(500).json({ error: error.message || 'Failed to add members' });
  }
});

// Remove members from group - Only admins can remove members
router.delete('/groups/:groupId/members/:memberId', async (req: AuthRequest, res: Response) => {
  try {
    const { groupId, memberId } = req.params;
    const currentUserId = new Types.ObjectId(req.user!.id);
    const groupIdObj = new Types.ObjectId(groupId);
    const memberIdObj = new Types.ObjectId(memberId);

    const group = await Group.findById(groupIdObj);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions: Allow if user is admin/organization OR if user is admin of the group OR if user is an opportunity mentor OR if user is the group creator
    const isAdminOrOrganization = user.role === 'admin' || user.role === 'organization';
    const isGroupAdmin = group.admins.some((adminId: Types.ObjectId) => adminId.toString() === currentUserId.toString());
    const isGroupCreator = group.createdBy.toString() === currentUserId.toString();
    
    // Check if user is an opportunity mentor for this group's opportunity
    let isOpportunityMentor = false;
    if (group.opportunityId && user.role === 'volunteer') {
      const mentorAssignment = await OpportunityMentor.findOne({
        volunteer: currentUserId,
        opportunity: group.opportunityId,
      });
      isOpportunityMentor = !!mentorAssignment;
    }
    
    if (!isAdminOrOrganization && !isGroupAdmin && !isOpportunityMentor && !isGroupCreator) {
      return res.status(403).json({ error: 'You don\'t have permission to remove members from this group' });
    }

    // Don't allow removing the last admin
    if (group.admins.length === 1 && group.admins[0].toString() === memberId) {
      return res.status(400).json({ error: 'Cannot remove the last admin from the group' });
    }

    // Remove member
    group.members = group.members.filter((id: Types.ObjectId) => id.toString() !== memberId);
    
    // If removed member was an admin, remove from admins too
    if (group.admins.some((id: Types.ObjectId) => id.toString() === memberId)) {
      group.admins = group.admins.filter((id: Types.ObjectId) => id.toString() !== memberId);
    }

    await group.save();

    const updatedGroup = await Group.findById(groupIdObj)
      .populate('members', 'name image role')
      .populate('admins', 'name image role')
      .lean() as any;

    res.json({
      ...updatedGroup,
      _id: updatedGroup._id.toString(),
      opportunityId: updatedGroup.opportunityId?.toString(),
    });
  } catch (error: any) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove member' });
  }
});

// Delete group - Only admins can delete
router.delete('/groups/:groupId', async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const currentUserId = new Types.ObjectId(req.user!.id);
    const groupIdObj = new Types.ObjectId(groupId);

    const group = await Group.findById(groupIdObj);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions: Allow if user is admin/organization OR if user is admin of the group OR if user is the group creator OR if user is an opportunity mentor
    const isAdminOrOrganization = user.role === 'admin' || user.role === 'organization';
    const isGroupAdmin = group.admins.some((adminId: Types.ObjectId) => adminId.toString() === currentUserId.toString());
    const isGroupCreator = group.createdBy.toString() === currentUserId.toString();
    
    // Check if user is an opportunity mentor for this group's opportunity
    let isOpportunityMentor = false;
    if (group.opportunityId && user.role === 'volunteer') {
      const mentorAssignment = await OpportunityMentor.findOne({
        volunteer: currentUserId,
        opportunity: group.opportunityId,
      });
      isOpportunityMentor = !!mentorAssignment;
    }
    
    if (!isAdminOrOrganization && !isGroupAdmin && !isGroupCreator && !isOpportunityMentor) {
      return res.status(403).json({ 
        error: 'You don\'t have permission to delete this group. Only group creators, admins, organizations, and opportunity mentors can delete groups.' 
      });
    }

    // Delete all messages in the group
    await Message.deleteMany({ group: groupIdObj });

    // Delete the group
    await Group.findByIdAndDelete(groupIdObj);

    res.json({ success: true, message: 'Group deleted successfully' });
  } catch (error: any) {
    console.error('Delete group error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete group' });
  }
});

export default router;

