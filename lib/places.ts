import { useEffect, useState } from 'react';

import { useAuth } from './auth';
import { friendlyError } from './errors';
import { supabase } from './supabase';

export type PlaceKind = 'shop' | 'vulcator';

export type Place = {
  id: number;
  name: string;
  kind: PlaceKind;
  lat: number;
  lng: number;
  address: string | null;
  phone: string | null;
  hours: string | null;
  description: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type PlaceInput = Pick<Place, 'name' | 'kind' | 'lat' | 'lng' | 'address' | 'phone' | 'hours' | 'description'>;

export const KIND_LABEL: Record<PlaceKind, string> = {
  shop: 'Vulcanizing shop',
  vulcator: 'Mobile Vulcator',
};

/** Siargao Island: the map stays inside this area. [west, south, east, north] */
export const SIARGAO_BOUNDS: [number, number, number, number] = [125.9, 9.66, 126.24, 10.12];
export const SIARGAO_CENTER = { lat: 9.885, lng: 126.08 };

export function isInSiargao(lat: number, lng: number) {
  const [w, s, e, n] = SIARGAO_BOUNDS;
  return lng >= w && lng <= e && lat >= s && lat <= n;
}

/** All places, kept up to date live (Supabase Realtime). */
export function usePlaces() {
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    supabase
      .from('places')
      .select('*')
      .order('name')
      .returns<Place[]>()
      .then(({ data, error: e }) => {
        if (!active) return;
        if (e) setError(friendlyError(e));
        else {
          setError(null);
          setPlaces(data ?? []);
        }
      });

    const channel = supabase
      .channel('places-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'places' }, (payload) => {
        setPlaces((cur) => {
          const list = cur ?? [];
          if (payload.eventType === 'DELETE') return list.filter((p) => p.id !== (payload.old as Place).id);
          const row = payload.new as Place;
          const exists = list.some((p) => p.id === row.id);
          return exists ? list.map((p) => (p.id === row.id ? row : p)) : [...list, row];
        });
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [reloadKey]);

  return { places, error, reload: () => setReloadKey((k) => k + 1) };
}

/** True if the signed-in user is in the admins table. */
export function useIsAdmin() {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId) return setIsAdmin(false);
    supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [userId]);

  return isAdmin;
}

export async function getPlace(id: number) {
  const { data, error } = await supabase.from('places').select('*').eq('id', id).single<Place>();
  if (error) throw error;
  return data;
}

export async function savePlace(input: PlaceInput, id?: number) {
  const { error } = id
    ? await supabase.from('places').update(input).eq('id', id)
    : await supabase.from('places').insert(input);
  if (error) throw error;
}

export async function deletePlace(id: number) {
  const { error } = await supabase.from('places').delete().eq('id', id);
  if (error) throw error;
}

/** Distance in km between two points (haversine). */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(km < 10 ? 1 : 0)} km away`;
}

/** Opens turn-by-turn directions in Google Maps (free, no API key needed). */
export function directionsUrl(p: { lat: number; lng: number }) {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=driving`;
}
