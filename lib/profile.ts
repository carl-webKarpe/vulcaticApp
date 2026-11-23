import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { uploadImage } from './posts';
import { AVATARS_BUCKET, supabase } from './supabase';

/** Only the person sees these; the admin sees them for Vulcators and shops. */
export type PrivateDetails = { full_name: string | null; mobile: string | null; gcash: string | null };

export async function getPrivateDetails(userId: string) {
  const { data, error } = await supabase
    .from('private_details')
    .select('full_name, mobile, gcash')
    .eq('user_id', userId)
    .maybeSingle<PrivateDetails>();
  if (error) throw error;
  return data ?? { full_name: null, mobile: null, gcash: null };
}

export async function savePrivateDetails(userId: string, details: PrivateDetails) {
  const { error } = await supabase.from('private_details').upsert({ user_id: userId, ...details });
  if (error) throw error;
}

/** Shrinks the photo first, so pins load fast on slow internet. */
export async function saveAvatar(userId: string, uri: string) {
  const small = await (await ImageManipulator.manipulate(uri).resize({ width: 256 }).renderAsync()).saveAsync({
    compress: 0.8,
    format: SaveFormat.JPEG,
  });
  const path = await uploadImage(userId, small.uri, 'image/jpeg', AVATARS_BUCKET);
  const { error } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', userId).select('id').single();
  if (error) throw error;
}
