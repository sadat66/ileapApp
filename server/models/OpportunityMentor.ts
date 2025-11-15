import mongoose, { Schema } from 'mongoose';

export interface IOpportunityMentor {
  opportunity: mongoose.Types.ObjectId;
  volunteer: mongoose.Types.ObjectId;
  organization_profile: mongoose.Types.ObjectId;
  assigned_by: mongoose.Types.ObjectId;
  assigned_at?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const OpportunityMentorSchema: Schema = new Schema<IOpportunityMentor>(
  {
    opportunity: {
      type: Schema.Types.ObjectId,
      ref: 'opportunity',
      required: true,
    },
    volunteer: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    organization_profile: {
      type: Schema.Types.ObjectId,
      ref: 'organization_profile',
      required: true,
    },
    assigned_by: {
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    },
    assigned_at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create unique index to prevent duplicate mentor assignments for the same opportunity
OpportunityMentorSchema.index(
  { opportunity: 1, volunteer: 1 },
  { unique: true }
);

// Create index for querying mentors by organization
OpportunityMentorSchema.index({ organization_profile: 1 });

// Create index for querying mentors by opportunity
OpportunityMentorSchema.index({ opportunity: 1 });

export const OpportunityMentor =
  mongoose.models.opportunity_mentor ||
  mongoose.model<IOpportunityMentor>('opportunity_mentor', OpportunityMentorSchema);

