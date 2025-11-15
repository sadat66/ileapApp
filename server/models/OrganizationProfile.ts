import mongoose, { Schema } from 'mongoose';

export interface IOrganizationProfile {
  title: string;
  contact_email: string;
  phone_number: string;
  bio: string;
  type: string;
  opportunity_types: string[];
  required_skills: string[];
  state: string;
  area: string;
  abn: string;
  website?: string;
  profile_img?: string;
  cover_img?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const allowedTypes = [
  'ngo', 'nonprofit', 'community_group', 'social_enterprise', 'charity',
  'educational_institution', 'healthcare_provider', 'religious_institution',
  'environmental_group', 'youth_organization', 'arts_culture_group',
  'disaster_relief_agency', 'advocacy_group', 'international_aid',
  'sports_club', 'animal_shelter'
];

const OrganizationProfileSchema: Schema = new Schema<IOrganizationProfile>(
  {
    title: { type: String, required: true },
    contact_email: { type: String, required: true },
    phone_number: { type: String, required: true },
    bio: { type: String, required: true },
    type: {
      type: String,
      required: true,
      validate: {
        validator: function(v: string) {
          return allowedTypes.includes(v);
        },
        message: (props: any) => `${props.value} is not a valid organization type`
      }
    },
    opportunity_types: { type: [String], required: true },
    required_skills: { type: [String], required: true },
    state: { type: String, required: true },
    area: { type: String, required: true },
    abn: { type: String, required: true },
    website: { type: String },
    profile_img: { type: String },
    cover_img: { type: String },
  },
  {
    timestamps: true,
    validateBeforeSave: true
  }
);

// Add pre-save middleware to ensure arrays are not empty
OrganizationProfileSchema.pre('save', function(next) {
  const doc = this as any as IOrganizationProfile;
  if (doc.opportunity_types && doc.opportunity_types.length === 0) {
    next(new Error('At least one opportunity type is required'));
    return;
  }
  if (doc.required_skills && doc.required_skills.length === 0) {
    next(new Error('At least one required skill is required'));
    return;
  }
  next();
});

export const OrganizationProfile = mongoose.models.organization_profile || 
  mongoose.model<IOrganizationProfile>('organization_profile', OrganizationProfileSchema);

