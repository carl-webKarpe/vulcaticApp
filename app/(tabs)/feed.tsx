import { View } from 'react-native';

import { Hero } from '@/components/Hero';
import { PostList } from '@/components/PostList';

export default function Feed() {
  return (
    <PostList
      header={
        <View style={{ marginBottom: 16 }}>
          <Hero title="On the road today" text="Share road tips and photos with riders around Siargao." />
        </View>
      }
      emptyTitle="It's quiet in here…"
      emptyMessage="No one has shared anything yet. Be the first to post a photo!"
    />
  );
}
