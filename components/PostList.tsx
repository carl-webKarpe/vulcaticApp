import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { usePendingPosts } from '@/lib/pending';
import { deletePost, fetchPosts, PAGE_SIZE, setLiked } from '@/lib/posts';
import { useTheme } from '@/lib/theme';
import type { FeedPost } from '@/lib/types';

import { EmptyState } from './EmptyState';
import { Notice } from './Notice';
import { PendingPostCard, PostCard } from './PostCard';
import { SkeletonCard } from './SkeletonCard';

type Props = {
  /** Only show this user's posts (used on the profile screen). */
  onlyUserId?: string;
  header?: ReactElement;
  emptyTitle: string;
  emptyMessage: string;
};

function confirm(message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert('Delete this post?', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export function PostList({ onlyUserId, header, emptyTitle, emptyMessage }: Props) {
  const t = useTheme();
  const { session } = useAuth();
  const { pending, version, retry, discard } = usePendingPosts();
  const userId = session?.user.id;

  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  /** Loads the first page (used on open, pull-to-refresh, and after a new post). */
  const loadFirst = useCallback(async () => {
    if (!userId) return;
    try {
      const page = await fetchPosts(userId, { onlyUserId });
      setPosts(page);
      setHasMore(page.length === PAGE_SIZE);
      setError(null);
    } catch (e) {
      setError(friendlyError(e));
    }
  }, [userId, onlyUserId]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst, version]);

  const loadMore = async () => {
    if (!userId || !posts?.length || !hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchPosts(userId, { onlyUserId, before: posts[posts.length - 1].created_at });
      setPosts((cur) => {
        const seen = new Set(cur?.map((p) => p.id));
        return [...(cur ?? []), ...page.filter((p) => !seen.has(p.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
    } catch (e) {
      setActionError(friendlyError(e));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setActionError(null);
    await loadFirst();
    setRefreshing(false);
  };

  const onToggleLike = async (post: FeedPost) => {
    if (!userId) return;
    const like = !post.likedByMe;
    const apply = (liked: boolean) =>
      setPosts(
        (cur) =>
          cur?.map((p) =>
            p.id === post.id && p.likedByMe !== liked
              ? { ...p, likedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) }
              : p,
          ) ?? null,
      );
    apply(like); // update the screen right away, then save
    try {
      await setLiked(post.id, userId, like);
    } catch (e) {
      apply(!like); // undo if saving failed
      setActionError(friendlyError(e));
    }
  };

  const onDelete = async (post: FeedPost) => {
    if (!(await confirm('It will be removed for everyone. This cannot be undone.'))) return;
    const before = posts;
    setPosts((cur) => cur?.filter((p) => p.id !== post.id) ?? null);
    try {
      await deletePost(post);
    } catch (e) {
      setPosts(before);
      setActionError(friendlyError(e));
    }
  };

  const content = { contentContainerStyle: styles.list, style: { backgroundColor: t.background } };

  // First load: grey placeholder cards.
  if (posts === null && !error) {
    return (
      <FlatList
        {...content}
        data={[1, 2, 3]}
        keyExtractor={(i) => `skeleton-${i}`}
        renderItem={() => <SkeletonCard />}
        ListHeaderComponent={header}
        scrollEnabled={false}
      />
    );
  }

  // Could not load at all.
  if (posts === null && error) {
    return (
      <FlatList
        {...content}
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            {header}
            <EmptyState
              title="Oops! Couldn't load posts"
              message={error}
              actionTitle="Try again"
              onAction={() => {
                setError(null);
                loadFirst();
              }}
            />
          </>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.primary]} />}
      />
    );
  }

  const myPending = pending; // all pending posts are mine

  return (
    <FlatList
      {...content}
      data={posts ?? []}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => (
        <PostCard post={item} onToggleLike={onToggleLike} onDelete={item.user_id === userId ? onDelete : undefined} />
      )}
      ListHeaderComponent={
        <>
          {header}
          {actionError && (
            <View style={styles.notice}>
              <Notice kind="error" text={actionError} />
            </View>
          )}
          {myPending.map((p) => (
            <PendingPostCard key={p.id} post={p} onRetry={() => retry(p.id)} onDiscard={() => discard(p.id)} />
          ))}
        </>
      }
      ListEmptyComponent={
        myPending.length === 0 ? (
          <EmptyState
            title={emptyTitle}
            message={emptyMessage}
            actionTitle="Share a photo"
            onAction={() => router.navigate('/new')}
          />
        ) : undefined
      }
      ListFooterComponent={
        loadingMore ? (
          <ActivityIndicator style={styles.footer} color={t.accent} />
        ) : posts && posts.length > 0 && !hasMore ? (
          <Text style={[styles.end, { color: t.muted }]}>You're all caught up 🦎</Text>
        ) : undefined
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.accent} colors={[t.primary]} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 32, width: '100%', maxWidth: 600, alignSelf: 'center' },
  notice: { marginBottom: 16 },
  footer: { marginVertical: 20 },
  end: { textAlign: 'center', marginVertical: 20, fontSize: 14 },
});
