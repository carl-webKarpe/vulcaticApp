import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import type { Place } from '@/lib/places';

import { MapFrame, type MapFrameHandle, type MapMessage } from './MapFrame';
import { buildMapHtml } from './mapHtml';

export type PlacesMapHandle = {
  focus: (lat: number, lng: number, zoom?: number) => void;
  resetView: () => void;
};

type Props = {
  places: Place[];
  selectedId: number | null;
  me: { lat: number; lng: number } | null;
  picking: boolean;
  onSelect: (id: number | null) => void;
  onCenter: (c: { lat: number; lng: number }) => void;
  onReady: () => void;
  onError: (reason: string) => void;
};

export const PlacesMap = forwardRef<PlacesMapHandle, Props>(function PlacesMap(
  { places, selectedId, me, picking, onSelect, onCenter, onReady, onError },
  ref,
) {
  const html = useMemo(buildMapHtml, []);
  const frame = useRef<MapFrameHandle>(null);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    focus: (lat, lng, zoom) => frame.current?.send({ type: 'focus', lat, lng, zoom }),
    resetView: () => frame.current?.send({ type: 'resetView' }),
  }));

  // Keep the map in sync with the app's state once it has loaded.
  useEffect(() => {
    if (ready) frame.current?.send({ type: 'places', places });
  }, [ready, places]);
  useEffect(() => {
    if (ready) frame.current?.send({ type: 'select', id: selectedId });
  }, [ready, selectedId]);
  useEffect(() => {
    if (ready && me) frame.current?.send({ type: 'me', ...me });
  }, [ready, me]);
  useEffect(() => {
    if (ready) frame.current?.send({ type: 'pickMode', on: picking });
  }, [ready, picking]);

  const onMessage = (msg: MapMessage) => {
    switch (msg.type) {
      case 'ready':
        setReady(true);
        onReady();
        break;
      case 'select':
        onSelect(msg.id as number);
        break;
      case 'tap':
        onSelect(null);
        break;
      case 'center':
        onCenter({ lat: msg.lat as number, lng: msg.lng as number });
        break;
      case 'error':
        onError(String(msg.message ?? 'error'));
        break;
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <MapFrame ref={frame} html={html} onMessage={onMessage} />
    </View>
  );
});
