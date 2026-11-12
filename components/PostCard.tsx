import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { publicImageUrl } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';
import type { FeedPost } from '@/lib/types';

type Props = {
  post: FeedPost;
  onToggleLike: (post: FeedPost) => void;
  onDelete?: (post: FeedPost) => void;
};

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function PostCard({ post, onToggleLike, onDelete }: Props) {
  const t = useTheme();
  const username = post.profiles?.username ?? 'unknown';

  return (
    <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }]}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: t.primary }]}>
          <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={[styles.username, { color: t.text }]}>{username}</Text>
        <Text style={{ color: t.muted }}>· {timeAgo(post.created_at)}</Text>
        {onDelete && (
          <Pressable onPress={() => onDelete(post)} hitSlop={10} style={styles.delete}>
            <Ionicons name="trash-outline" size={18} color={t.muted} />
          </Pressable>
        )}
      </View>

      {post.image_path && (
        <Image
          source={{ uri: publicImageUrl(post.image_path) }}
          style={[styles.image, { backgroundColor: t.border }]}
          contentFit="cover"
          transition={150}
        />
      )}

      {post.caption ? <Text style={[styles.caption, { color: t.text }]}>{post.caption}</Text> : null}

      <Pressable onPress={() => onToggleLike(post)} hitSlop={8} style={styles.likeRow}>
        <Ionicons
          name={post.likedByMe ? 'heart' : 'heart-outline'}
          size={22}
          color={post.likedByMe ? t.primary : t.muted}
        />
        <Text style={{ color: t.muted }}>{post.likeCount}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '700' },
  username: { fontWeight: '600', fontSize: 15 },
  delete: { marginLeft: 'auto' },
  image: { width: '100%', aspectRatio: 1 },
  caption: { fontSize: 15, lineHeight: 21, paddingHorizontal: 12, paddingTop: 10 },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 12 },
});
