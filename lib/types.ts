export type Role = 'user' | 'vulcator' | 'shop';

export type Profile = {
  id: string;
  username: string;
  role: Role;
  avatar_url: string | null;
  created_at: string;
};

export type Post = {
  id: number;
  user_id: string;
  caption: string | null;
  image_path: string | null;
  created_at: string;
  profiles: { username: string } | null;
  likes: { count: number }[];
};

export type FeedPost = Post & { likeCount: number; likedByMe: boolean };
