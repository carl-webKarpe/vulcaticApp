export type Role = 'user' | 'vulcator' | 'shop';
export const ROLE_LABEL: Record<Role, string> = { user: 'User', vulcator: 'Mobile Vulcator', shop: 'Vulcanizing shop' };

export type AccountStatus = 'pending' | 'approved' | 'rejected';
export const STATUS_LABEL: Record<AccountStatus, string> = { pending: 'Waiting', approved: 'Approved', rejected: 'Suspended' };

export type Profile = {
  id: string;
  username: string;
  role: Role;
  status: AccountStatus;
  avatar_url: string | null;
  created_at: string;
};

export type Post = {
  id: number;
  user_id: string;
  caption: string | null;
  image_path: string | null;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
  likes: { count: number }[];
};

export type FeedPost = Post & { likeCount: number; likedByMe: boolean };
