import { POST_IMAGES_BUCKET, supabase } from './supabase';
import type { FeedPost, Post } from './types';

const POST_SELECT = 'id, user_id, caption, image_path, created_at, profiles(username), likes(count)';

/** Loads posts (newest first), optionally only one user's, and marks which ones I liked. */
export async function fetchPosts(userId: string, onlyUserId?: string): Promise<FeedPost[]> {
  let query = supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(50);
  if (onlyUserId) query = query.eq('user_id', onlyUserId);

  const { data, error } = await query.returns<Post[]>();
  if (error) throw error;
  const posts = data ?? [];
  if (posts.length === 0) return [];

  const { data: myLikes, error: likesError } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', userId)
    .in(
      'post_id',
      posts.map((p) => p.id),
    );
  if (likesError) throw likesError;
  const liked = new Set((myLikes ?? []).map((l) => l.post_id as number));

  return posts.map((p) => ({ ...p, likeCount: p.likes?.[0]?.count ?? 0, likedByMe: liked.has(p.id) }));
}

export async function setLiked(postId: number, userId: string, like: boolean) {
  const { error } = like
    ? await supabase.from('likes').insert({ post_id: postId, user_id: userId })
    : await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', userId);
  if (error) throw error;
}

/** Uploads a local image (from the picker) into Storage under the user's own folder. */
export async function uploadImage(userId: string, localUri: string, mimeType?: string | null) {
  const contentType = mimeType ?? 'image/jpeg';
  const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const body = await fetch(localUri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).upload(path, body, { contentType });
  if (error) throw error;
  return path;
}

export async function createPost(userId: string, caption: string, imagePath: string | null) {
  const { error } = await supabase
    .from('posts')
    .insert({ user_id: userId, caption: caption.trim() || null, image_path: imagePath });
  if (error) throw error;
}

export async function deletePost(post: FeedPost) {
  const { error } = await supabase.from('posts').delete().eq('id', post.id);
  if (error) throw error;
  if (post.image_path) await supabase.storage.from(POST_IMAGES_BUCKET).remove([post.image_path]);
}
