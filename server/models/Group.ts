import { Schema, model, models } from 'mongoose';

export interface IGroup {
  name: string;
  description?: string;
  members: Schema.Types.ObjectId[];
  admins: Schema.Types.ObjectId[];
  createdBy: Schema.Types.ObjectId;
  isOrganizationGroup?: boolean;
  opportunityId?: Schema.Types.ObjectId;
  avatar?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const groupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    description: { type: String },
    members: [{ type: Schema.Types.ObjectId, ref: 'user' }],
    admins: [{ type: Schema.Types.ObjectId, ref: 'user' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    isOrganizationGroup: { type: Boolean, default: false },
    opportunityId: { type: Schema.Types.ObjectId },
    avatar: { type: String },
  },
  {
    timestamps: true,
  }
);

export const Group = models.group || model<IGroup>('group', groupSchema);

 