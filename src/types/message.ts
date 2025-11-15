export type Message = {
  _id: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  media?: {
    url: string;
    type: 'image' | 'video';
    mimeType: string;
    fileName?: string;
    size?: number;
  };
  sender: {
    _id: string;
    name: string;
    image: string;
    role?: string;
    organization_profile?: {
      title: string;
    };
  };
  receiver?: {
    _id: string;
    name: string;
    image: string;
    role?: string;
  };
  group?: {
    _id: string;
    name: string;
  };
};

export type Conversation = {
  name: string;
  _id: string;
  user: {
    _id: string;
    name: string;
    image: string;
    role: string;
    organization_profile?: {
      title: string;
    };
  };
  lastMessage: {
    content: string;
    isRead: boolean;
    createdAt: string;
  };
  unreadCount: number;
};

export type Group = {
  _id: string;
  name: string;
  description?: string;
  members: Array<{
    _id: string;
    name: string;
    image: string;
    role: string;
  }>;
  admins: Array<{
    _id: string;
    name: string;
    image: string;
    role: string;
  }>;
  lastMessage?: {
    content: string;
    isRead: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
  __v?: number;
  createdBy?: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
  isOrganizationGroup?: boolean;
  opportunityId?: string;
};

