import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Hero, IconBadge } from '@/components/Hero';
import { useAuth } from '@/lib/auth';
import { useTheme, type TintName } from '@/lib/theme';

/** Earnings and jobs arrive with requests in 2.0.0. No made-up numbers until then. */
export default function Work() {
  const t = useTheme();
  const isShop = useAuth().profile?.role === 'shop';

  const tip = (icon: 'sunny' | 'camera' | 'pricetag', tint: TintName, title: string, text: string, open: () => void) => (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      style={({ pressed }) => [styles.tip, { backgroundColor: t.card, borderColor: t.border }, pressed && { opacity: 0.8 }]}
    >
      <IconBadge icon={icon} tint={tint} />
      <View style={styles.flex}>
        <Text style={[styles.tipTitle, { color: t.text }]}>{title}</Text>
        <Text style={[styles.tipText, { color: t.muted }]}>{text}</Text>
      </View>
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Hero gecko title="No jobs yet" text="Your jobs, earnings and ratings will show here when customers can send requests in the app." />
      <Text style={[styles.heading, { color: t.text }]}>Get more customers now</Text>
      {tip('sunny', 'amber', isShop ? 'Switch to Open' : 'Switch to Available', 'Customers look for who can help right now.', () =>
        router.navigate('/my-place'),
      )}
      {tip('camera', 'coral', 'Add your photo', 'People trust a face more than an empty pin.', () => router.push('/edit-profile'))}
      {tip('pricetag', 'blue', 'Show your prices', 'Customers like to know the price before they call.', () => router.navigate('/my-place'))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center', paddingBottom: 40 },
  heading: { fontSize: 18, fontWeight: '800', marginTop: 8 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 20, borderWidth: 1, padding: 16 },
  tipTitle: { fontSize: 16, fontWeight: '800' },
  tipText: { fontSize: 14, lineHeight: 20, marginTop: 2 },
});
