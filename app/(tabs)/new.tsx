import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '@/components/Button';
import { haptic } from '@/lib/haptics';
import { usePendingPosts } from '@/lib/pending';
import { useTheme } from '@/lib/theme';

type Picked = { uri: string; mimeType?: string | null };
const MAX_CAPTION = 500;

const PICK_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.7,
};

function showPermissionHelp(what: string) {
  const msg = `Vulcatic needs access to your ${what}. You can allow it in your phone's Settings.`;
  if (Platform.OS === 'web') return window.alert(msg);
  Alert.alert('Permission needed', msg, [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ]);
}

export default function NewPost() {
  const t = useTheme();
  const { addPost } = usePendingPosts();
  const [image, setImage] = useState<Picked | null>(null);
  const [caption, setCaption] = useState('');

  const applyResult = (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled) return;
    const asset = result.assets[0];
    setImage({ uri: asset.uri, mimeType: asset.mimeType });
    haptic.tap();
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return showPermissionHelp('camera');
    }
    applyResult(await ImagePicker.launchCameraAsync(PICK_OPTIONS));
  };

  const pickFromGallery = async () => {
    applyResult(await ImagePicker.launchImageLibraryAsync(PICK_OPTIONS));
  };

  const share = () => {
    // The post appears in the feed right away and uploads in the background.
    addPost({ uri: image?.uri ?? null, mimeType: image?.mimeType, caption: caption.trim() });
    setImage(null);
    setCaption('');
    router.navigate('/feed');
  };

  const canShare = !!image || caption.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: t.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {image ? (
          <View style={styles.previewWrap}>
            <Image source={{ uri: image.uri }} style={styles.preview} contentFit="cover" />
            <Pressable
              onPress={() => setImage(null)}
              style={styles.removeBtn}
              hitSlop={8}
              accessibilityLabel="Remove photo"
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
            <View style={styles.changeRow}>
              <Pressable onPress={takePhoto} style={styles.changeBtn}>
                <Ionicons name="camera" size={18} color="#fff" />
                <Text style={styles.changeText}>Retake</Text>
              </Pressable>
              <Pressable onPress={pickFromGallery} style={styles.changeBtn}>
                <Ionicons name="images" size={18} color="#fff" />
                <Text style={styles.changeText}>Change</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.picker, { borderColor: t.border, backgroundColor: t.card }]}>
            <View style={[styles.pickerIcon, { backgroundColor: t.accentSoft }]}>
              <Ionicons name="image-outline" size={34} color={t.accent} />
            </View>
            <Text style={[styles.pickerTitle, { color: t.text }]}>Add a photo</Text>
            <Text style={[styles.pickerHint, { color: t.muted }]}>Snap something new or pick from your gallery</Text>
            <View style={styles.pickerButtons}>
              <View style={styles.flex}>
                <Button title="Camera" icon="camera" onPress={takePhoto} />
              </View>
              <View style={styles.flex}>
                <Button title="Gallery" icon="images" variant="outline" onPress={pickFromGallery} />
              </View>
            </View>
          </View>
        )}

        <View style={[styles.captionBox, { backgroundColor: t.card, borderColor: t.border }]}>
          <TextInput
            style={[styles.caption, { color: t.text }]}
            placeholder="Write a caption…"
            placeholderTextColor={t.muted}
            multiline
            maxLength={MAX_CAPTION}
            value={caption}
            onChangeText={setCaption}
          />
          <Text style={[styles.counter, { color: caption.length > MAX_CAPTION - 50 ? t.accent : t.muted }]}>
            {caption.length}/{MAX_CAPTION}
          </Text>
        </View>

        <Button title="Share" icon="paper-plane" onPress={share} disabled={!canShare} />
        {!canShare && <Text style={[styles.helper, { color: t.muted }]}>Add a photo or write something to share.</Text>}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: 16, gap: 14, width: '100%', maxWidth: 600, alignSelf: 'center' },
  previewWrap: { borderRadius: 20, overflow: 'hidden' },
  preview: { width: '100%', aspectRatio: 1 },
  removeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeRow: { position: 'absolute', bottom: 12, left: 12, flexDirection: 'row', gap: 8 },
  changeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 18,
  },
  changeText: { color: '#fff', fontWeight: '600' },
  picker: {
    borderRadius: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    padding: 24,
    paddingVertical: 36,
    gap: 6,
  },
  pickerIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  pickerTitle: { fontSize: 18, fontWeight: '800' },
  pickerHint: { fontSize: 14, textAlign: 'center' },
  pickerButtons: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
  captionBox: { borderWidth: 1.5, borderRadius: 16, padding: 12 },
  caption: { minHeight: 90, fontSize: 16, textAlignVertical: 'top', outlineStyle: 'none' } as object,
  counter: { alignSelf: 'flex-end', fontSize: 12 },
  helper: { textAlign: 'center', fontSize: 13, marginTop: -4 },
});
