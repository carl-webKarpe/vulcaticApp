import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { friendlyError } from './errors';
import { supabase } from './supabase';

export type PlaceKind = 'shop' | 'vulcator';

export const SERVICES = {
  flat_tire: 'Flat tire repair',
  vulcanizing: 'Tire vulcanizing',
  replacement: 'Tire replacement',
  air_refill: 'Air refill',
  jump_start: 'Battery jump-start',
};
export type ServiceKey = keyof typeof SERVICES;
export const SERVICE_KEYS = Object.keys(SERVICES) as ServiceKey[];

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
  owner_id: string | null;
  approved: boolean;
  is_open: boolean | null;
  photo_path: string | null;
  /** Price in pesos for each service offered. */
  prices: Partial<Record<ServiceKey, number>>;
  /** null = the usual for its kind. */
  roadside: boolean | null;
  shop_visits: boolean | null;
  created_at: string;
  updated_at: string;
};

export type PlaceInput = Pick<Place, 'name' | 'kind' | 'lat' | 'lng' | 'address' | 'phone' | 'hours' | 'description' | 'prices' | 'roadside' | 'shop_visits'>;

export const goesToCustomer = (p: Pick<Place, 'kind' | 'roadside'>) => p.roadside ?? p.kind === 'vulcator';
export const takesVisits = (p: Pick<Place, 'kind' | 'shop_visits'>) => p.shop_visits ?? p.kind === 'shop';

/** "150" or "19.50" typed by the owner, as a price from 1 to 100,000. null = not a valid price. */
export function parsePrice(text: string): number | null {
  const clean = text.replace(/[₱,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const n = Number(clean);
  return n >= 1 && n <= 100000 ? n : null;
}

export const peso = (n: number) => `₱${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

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

const STATUS_HOURS = 12;

/** true = open/available, false = closed/off, null = unknown or too old to trust. */
export function openStatus(p: Pick<Place, 'is_open' | 'updated_at'>, now = Date.now()): boolean | null {
  // shortcut: any edit refreshes updated_at, add a status_at column if edits make old statuses look fresh.
  if (p.is_open === true && now - Date.parse(p.updated_at) > STATUS_HOURS * 3600_000) return null;
  return p.is_open;
}

export function statusLabel(p: Place): string | null {
  const open = openStatus(p);
  if (open === null) return null;
  if (p.kind === 'shop') return open ? 'Open now' : 'Closed';
  return open ? 'Available now' : 'Not available';
}

/** Pins everyone may see. Demo pins have made-up phone numbers, so they stay hidden. */
const isPublic = (p: Place) => p.approved && !p.is_demo;

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
      .eq('approved', true)
      .eq('is_demo', false)
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
          if (!isPublic(row)) return list.filter((p) => p.id !== row.id);
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

export type Ratings = Record<number, { stars: number; ratings: number }>;

/** Average stars for each place. Says nothing about who rated. */
export async function getRatings(): Promise<Ratings> {
  const { data, error } = await supabase.rpc('place_ratings');
  if (error) throw error;
  return Object.fromEntries(
    ((data ?? []) as { place_id: number; stars: number; ratings: number }[]).map((r) => [r.place_id, { stars: Number(r.stars), ratings: Number(r.ratings) }]),
  );
}

export async function getPlace(id: number) {
  const { data, error } = await supabase.from('places').select('*').eq('id', id).single<Place>();
  if (error) throw error;
  return data;
}

export async function savePlace(input: PlaceInput, id?: number) {
  const q = id ? supabase.from('places').update(input).eq('id', id) : supabase.from('places').insert(input);
  // .single() makes an edit that the security rules blocked fail instead of looking saved.
  const { error } = await q.select('id').single();
  if (error) throw error;
}

export async function patchPlace(id: number, patch: Partial<Pick<Place, 'is_open' | 'approved' | 'lat' | 'lng'>>) {
  const { data, error } = await supabase.from('places').update(patch).eq('id', id).select('*').single<Place>();
  if (error) throw error;
  return data;
}

export async function getMyPlace(userId: string) {
  const { data, error } = await supabase.from('places').select('*').eq('owner_id', userId).maybeSingle<Place>();
  if (error) throw error;
  return data;
}

export async function getWaitingPlaces() {
  const { data, error } = await supabase.from('places').select('*').eq('approved', false).order('created_at').returns<Place[]>();
  if (error) throw error;
  return data ?? [];
}

export async function deletePlace(id: number) {
  const { error } = await supabase.from('places').delete().eq('id', id);
  if (error) throw error;
}

export function callPlace(phone: string | null) {
  const number = phone?.replace(/[^\d+]/g, '');
  if (number) Linking.openURL(`tel:${number}`);
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
