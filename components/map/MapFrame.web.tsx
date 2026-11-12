import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export type MapMessage = { type: string; [key: string]: unknown };
export type MapFrameHandle = { send: (msg: MapMessage) => void };
type Props = { html: string; onMessage: (msg: MapMessage) => void };

/** Web version: the map page runs inside an iframe. */
export const MapFrame = forwardRef<MapFrameHandle, Props>(function MapFrame({ html, onMessage }, ref) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useImperativeHandle(ref, () => ({
    send: (msg) => frame.current?.contentWindow?.postMessage(msg, '*'),
  }));

  useEffect(() => {
    const listen = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow || !e.data?.__vulcaticMap) return;
      handler.current(e.data);
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);

  return createElement('iframe', {
    ref: frame,
    srcDoc: html,
    title: 'Map of Siargao',
    style: { border: 0, width: '100%', height: '100%', display: 'block' },
  });
});
