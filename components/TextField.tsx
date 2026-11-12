import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/lib/theme';

type Props = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Shows an eye button to show/hide the text. */
  password?: boolean;
  hint?: string;
};

export type TextFieldRef = ComponentRef<typeof TextInput>;

export const TextField = forwardRef<TextFieldRef, Props>(function TextField(
  { label, icon, password, hint, style, ...rest },
  ref,
) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: t.muted }]}>{label}</Text>
      <View
        style={[
          styles.box,
          { backgroundColor: t.card, borderColor: focused ? t.accent : t.border },
          focused && { borderWidth: 2 },
        ]}
      >
        {icon && <Ionicons name={icon} size={20} color={focused ? t.accent : t.muted} />}
        <TextInput
          ref={ref}
          placeholderTextColor={t.muted}
          secureTextEntry={password && hidden}
          autoCapitalize="none"
          autoCorrect={false}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          style={[styles.input, { color: t.text }, style]}
        />
        {password && (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            hitSlop={10}
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={t.muted} />
          </Pressable>
        )}
      </View>
      {hint && <Text style={[styles.hint, { color: t.muted }]}>{hint}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', marginLeft: 2 },
  box: {
    height: 52,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  input: { flex: 1, fontSize: 16, height: '100%', outlineStyle: 'none' } as object,
  hint: { fontSize: 12, marginLeft: 2 },
});
