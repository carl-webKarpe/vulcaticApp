import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { Button } from '@/components/Button';
import { useAuth } from '@/lib/auth';
import { createPost, uploadImage } from '@/lib/posts';
import { useTheme } from '@/lib/theme';

type Picked = { uri: string; mimeType?: string | null };

export default function NewPost() {
  const t = useTheme();
  const { session } = useAuth();
  const [image, setImage] = useState<Picked | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setImage({ uri: asset.uri, mimeType: asset.mimeType });
    }
  };

  const submit = async () => {
    if (!session) return;
    setPosting(true);
    setError(null);
    try {
      const path = image ? await uploadImage(session.user.id, image.uri, image.mimeType) : null;
      await createPost(session.user.id, caption, path);
      setImage(null);
      setCaption('');
      router.navigate('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPosting(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: t.background }} contentContainerStyle={styles.container}>
      <Pressable onPress={pickImage} style={[styles.picker, { borderColor: t.border, backgroundColor: t.card }]}>
        {image ? (
          <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />
        ) : (
          <>
            <Ionicons name="image-outline" size={40} color={t.muted} />
            <Text style={{ color: t.muted }}>Tap to choose a photo</Text>
          </>
        )}
      </Pressable>

      <TextInput
        style={[styles.caption, { color: t.text, backgroundColor: t.card, borderColor: t.border }]}
        placeholder="Write a caption…"
        placeholderTextColor={t.muted}
        multiline
        maxLength={500}
        value={caption}
        onChangeText={setCaption}
      />

      {error && <Text style={{ color: t.danger }}>{error}</Text>}

      <Button title="Share" onPress={submit} loading={posting} disabled={!image && !caption.trim()} />
      {image && <Button title="Remove photo" variant="outline" onPress={() => setImage(null)} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center' },
  picker: {
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  preview: { width: '100%', height: '100%' },
  caption: { minHeight: 90, borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, textAlignVertical: 'top' },
});
