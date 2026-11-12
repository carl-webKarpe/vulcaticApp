import { PostList } from '@/components/PostList';

export default function Feed() {
  return (
    <PostList
      emptyTitle="It's quiet in here…"
      emptyMessage="No one has shared anything yet. Be the first to post a photo!"
    />
  );
}
