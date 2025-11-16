import mongoose, { Schema } from 'mongoose';

export interface IUser {
  name: string;
  email: string;
  password?: string;
  provider?: string;
  role?: string;
  image?: string;
  is_verified?: boolean;
  volunteer_profile?: mongoose.Types.ObjectId;
  organization_profile?: mongoose.Types.ObjectId;
  last_seen?: Date;
  expoPushToken?: string;
  createdAt?: Date; 
  updatedAt?: Date;
}

const UserSchema: Schema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    provider: { type: String, default: 'credentials' },
    role: { type: String },
    image: { type: String },
    is_verified: { type: Boolean, default: false },
    volunteer_profile: { type: Schema.Types.ObjectId, ref: 'volunteer_profile' },
    organization_profile: { type: Schema.Types.ObjectId, ref: 'organization_profile' },
    last_seen: { type: Date, default: Date.now, index: true },
    expoPushToken: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.models.user || mongoose.model<IUser>('user', UserSchema);

