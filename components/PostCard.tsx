import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRef } from 'react';
import { ActivityIndicator, Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { haptic } from '@/lib/haptics';
import type { PendingPost } from '@/lib/pending';
import { publicImageUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import { timeAgo } from '@/lib/time';
import type { FeedPost } from '@/lib/types';

import { Avatar } from './Avatar';

const native = Platform.OS !== 'web';
const DOUBLE_TAP_MS = 280;

type Props = {
  post: FeedPost;
  onToggleLike: (post: FeedPost) => void;
  onDelete?: (post: FeedPost) => void;
};

export function PostCard({ post, onToggleLike, onDelete }: Props) {
  const t = useTheme();
  const username = post.profiles?.username ?? 'unknown';
  const lastTap = useRef(0);
  const bigHeart = useRef(new Animated.Value(0)).current;
  const smallHeart = useRef(new Animated.Value(1)).current;

  const bounceSmallHeart = () => {
    smallHeart.setValue(0.7);
    Animated.spring(smallHeart, { toValue: 1, friction: 3, tension: 160, useNativeDriver: native }).start();
  };

  const toggleLike = () => {
    if (!post.likedByMe) haptic.tap();
    bounceSmallHeart();
    onToggleLike(post);
  };

  // Double-tap the photo to like (never unlikes, like Instagram).
  const onImagePress = () => {
    const now = Date.now();
    if (now - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      bigHeart.setValue(0);
      Animated.sequence([
        Animated.spring(bigHeart, { toValue: 1, friction: 4, tension: 120, useNativeDriver: native }),
        Animated.delay(350),
        Animated.timing(bigHeart, { toValue: 0, duration: 200, useNativeDriver: native }),
      ]).start();
      if (!post.likedByMe) {
        haptic.tap();
        bounceSmallHeart();
        onToggleLike(post);
      }
    } else {
      lastTap.current = now;
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.header}>
        <Avatar name={username} />
        <View style={styles.headerText}>
          <Text style={[styles.username, { color: t.text }]} numberOfLines={1}>
            {username}
          </Text>
          <Text style={[styles.time, { color: t.muted }]}>{timeAgo(post.created_at)}</Text>
        </View>
        {onDelete && (
          <Pressable
            onPress={() => onDelete(post)}
            hitSlop={12}
            style={styles.iconButton}
            accessibilityLabel="Delete post"
          >
            <Ionicons name="trash-outline" size={20} color={t.muted} />
          </Pressable>
        )}
      </View>

      {post.image_path && (
        <Pressable onPress={onImagePress} accessibilityLabel="Photo. Double tap to like.">
          <Image
            source={{ uri: publicImageUrl(post.image_path) }}
            style={[styles.image, { backgroundColor: t.skeleton }]}
            contentFit="cover"
            transition={200}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bigHeart,
              {
                opacity: bigHeart,
                transform: [{ scale: bigHeart.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
              },
            ]}
          >
            <Ionicons name="heart" size={110} color="#FFFFFF" style={styles.bigHeartShadow} />
          </Animated.View>
        </Pressable>
      )}

      <View style={styles.footer}>
        <Pressable
          onPress={toggleLike}
          hitSlop={10}
          style={styles.likeRow}
          accessibilityRole="button"
          accessibilityLabel={post.likedByMe ? 'Unlike' : 'Like'}
          accessibilityState={{ selected: post.likedByMe }}
        >
          <Animated.View style={{ transform: [{ scale: smallHeart }] }}>
            <Ionicons
              name={post.likedByMe ? 'heart' : 'heart-outline'}
              size={26}
              color={post.likedByMe ? t.accent : t.text}
            />
          </Animated.View>
          <Text style={[styles.likeCount, { color: t.text }]}>
            {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
          </Text>
        </Pressable>

        {post.caption ? (
          <Text style={[styles.caption, { color: t.text }]}>
            <Text style={styles.captionName}>{username} </Text>
            {post.caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

type PendingProps = { post: PendingPost; onRetry: () => void; onDiscard: () => void };

/** A post that is still uploading, or failed to upload. */
export function PendingPostCard({ post, onRetry, onDiscard }: PendingProps) {
  const t = useTheme();
  const failed = post.status === 'failed';

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: failed ? t.danger : t.border }]}>
      <View style={styles.header}>
        {failed ? (
          <Ionicons name="alert-circle" size={22} color={t.danger} />
        ) : (
          <ActivityIndicator color={t.accent} />
        )}
        <View style={styles.headerText}>
          <Text style={[styles.username, { color: t.text }]}>{failed ? "Couldn't share your post" : 'Sharing…'}</Text>
          {failed && post.error && <Text style={[styles.time, { color: t.muted }]}>{post.error}</Text>}
        </View>
      </View>

      {post.uri && (
        <Image source={{ uri: post.uri }} style={[styles.image, { opacity: failed ? 0.5 : 0.75 }]} contentFit="cover" />
      )}
      {post.caption ? <Text style={[styles.caption, styles.pendingCaption, { color: t.muted }]}>{post.caption}</Text> : null}

      {failed && (
        <View style={styles.pendingActions}>
          <Pressable onPress={onDiscard} style={[styles.pendingBtn, { borderColor: t.border }]}>
            <Text style={{ color: t.text, fontWeight: '600' }}>Discard</Text>
          </Pressable>
          <Pressable onPress={onRetry} style={[styles.pendingBtn, { backgroundColor: t.primary, borderColor: t.primary }]}>
            <Ionicons name="refresh" size={16} color={t.onPrimary} />
            <Text style={{ color: t.onPrimary, fontWeight: '700' }}>Try again</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  headerText: { flex: 1 },
  username: { fontWeight: '700', fontSize: 15 },
  time: { fontSize: 12, marginTop: 1 },
  iconButton: { padding: 4 },
  image: { width: '100%', aspectRatio: 1 },
  bigHeart: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  bigHeartShadow: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
  footer: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 14, gap: 6 },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  likeCount: { fontWeight: '700', fontSize: 14 },
  caption: { fontSize: 15, lineHeight: 21 },
  captionName: { fontWeight: '700' },
  pendingCaption: { paddingHorizontal: 14, paddingVertical: 12 },
  pendingActions: { flexDirection: 'row', gap: 10, padding: 14, paddingTop: 4, justifyContent: 'flex-end' },
  pendingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
  },
});
