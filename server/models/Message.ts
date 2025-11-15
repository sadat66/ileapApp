import { Schema, model, models } from 'mongoose';

export interface IMessage {
  sender: Schema.Types.ObjectId;
  receiver?: Schema.Types.ObjectId;
  group?: Schema.Types.ObjectId;
  content: string;
  media?: {
    url: string;
    type: 'image' | 'video';
    mimeType: string;
    fileName?: string;
    size?: number;
  };
  isRead: boolean;
  readBy: Array<{
    user: Schema.Types.ObjectId;
    readAt: Date;
  }>;
  createdAt?: Date;
  updatedAt?: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: false,
      index: true,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: 'group',
      required: false,
    },
    content: {
      type: String,
      required: true,
    },
    media: {
      url: {
        type: String,
      },
      type: {
        type: String,
        enum: ['image', 'video'],
      },
      mimeType: {
        type: String,
      },
      fileName: {
        type: String,
      },
      size: {
        type: Number,
      },
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readBy: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required: true,
      },
      readAt: {
        type: Date,
        default: Date.now,
      },
    }],
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ group: 1 });
messageSchema.index({ 'readBy.user': 1 });

export const Message = models.message || model<IMessage>('message', messageSchema);

