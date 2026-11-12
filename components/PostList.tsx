import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { deletePost, fetchPosts, setLiked } from '@/lib/posts';
import { useTheme } from '@/lib/theme';
import type { FeedPost } from '@/lib/types';

import { PostCard } from './PostCard';

type Props = {
  /** Only show this user's posts (used on the profile screen). */
  onlyUserId?: string;
  header?: ReactElement;
  emptyText: string;
};

function confirm(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert('Are you sure?', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export function PostList({ onlyUserId, header, emptyText }: Props) {
  const t = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);
      setPosts(await fetchPosts(userId, onlyUserId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [userId, onlyUserId]);

  // Reload every time the screen comes into view (e.g. after making a new post).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const onToggleLike = async (post: FeedPost) => {
    if (!userId) return;
    const like = !post.likedByMe;
    // Update the screen right away, then save.
    setPosts((cur) =>
      cur?.map((p) => (p.id === post.id ? { ...p, likedByMe: like, likeCount: p.likeCount + (like ? 1 : -1) } : p)) ??
      null,
    );
    try {
      await setLiked(post.id, userId, like);
    } catch {
      load();
    }
  };

  const onDelete = async (post: FeedPost) => {
    if (!(await confirm('This post will be deleted for everyone.'))) return;
    try {
      await deletePost(post);
      setPosts((cur) => cur?.filter((p) => p.id !== post.id) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (posts === null && !error) {
    return (
      <View style={[styles.center, { backgroundColor: t.background }]}>
        <ActivityIndicator color={t.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: t.background }}
      contentContainerStyle={styles.list}
      data={posts ?? []}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => (
        <PostCard post={item} onToggleLike={onToggleLike} onDelete={item.user_id === userId ? onDelete : undefined} />
      )}
      ListHeaderComponent={
        <>
          {header}
          {error && <Text style={[styles.error, { color: t.danger }]}>{error}</Text>}
        </>
      }
      ListEmptyComponent={!error ? <Text style={[styles.empty, { color: t.muted }]}>{emptyText}</Text> : undefined}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} />}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, width: '100%', maxWidth: 600, alignSelf: 'center' },
  empty: { textAlign: 'center', marginTop: 48, fontSize: 15 },
  error: { marginBottom: 12 },
});
