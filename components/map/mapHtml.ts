import { SIARGAO_BOUNDS, SIARGAO_CENTER } from '@/lib/places';
import { brand } from '@/lib/theme';

import { GECKO_MARKER_DATA_URI } from './geckoMarker';

/**
 * The map runs inside a WebView using MapLibre GL JS (open source) with free
 * OpenFreeMap tiles built from OpenStreetMap data: no API key, no usage limits.
 *
 * Messages in  (from the app):  places, me, select, focus, resetView, pickMode
 * Messages out (to the app):    ready, select, tap, center, error
 */
const MAPLIBRE_VERSION = '5.24.0';
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

export function buildMapHtml() {
  const [w, s, e, n] = SIARGAO_BOUNDS;
  const pad = 0.06;
  const config = {
    style: STYLE_URL,
    center: [SIARGAO_CENTER.lng, SIARGAO_CENTER.lat],
    bounds: [
      [w, s],
      [e, n],
    ],
    maxBounds: [
      [w - pad, s - pad],
      [e + pad, n + pad],
    ],
    orange: brand.orange,
    green: brand.green,
    ink: brand.ink,
    gecko: GECKO_MARKER_DATA_URI,
  };

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css" />
<script src="https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js"></script>
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #dfe9ef; }
  body { font-family: -apple-system, system-ui, Roboto, 'Segoe UI', sans-serif; -webkit-tap-highlight-color: transparent; }
  .pin { position: relative; width: 44px; height: 54px; cursor: pointer; transition: transform .18s ease; transform-origin: 50% 100%; }
  .pin > svg { position: absolute; inset: 0; filter: drop-shadow(0 3px 4px rgba(0,0,0,.35)); }
  .pin .face svg { display: block; }
  .pin .face { position: absolute; left: 7px; top: 6px; width: 30px; height: 30px; border-radius: 50%; background: #fff;
               display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .pin .face img { width: 30px; height: 30px; object-fit: contain; margin-top: 4px; }
  .pin.selected { transform: scale(1.3); z-index: 5; }
  .pin.dim { opacity: .55; }
  .label { position: absolute; top: 55px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 11px; font-weight: 700;
           color: ${brand.ink}; background: rgba(255,255,255,.92); padding: 2px 6px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.2);
           display: none; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
  body.zoomed .label, .pin.selected .label { display: block; }
  .me { width: 18px; height: 18px; border-radius: 50%; background: #1A73E8; border: 3px solid #fff; box-shadow: 0 0 0 0 rgba(26,115,232,.5);
        animation: pulse 2s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(26,115,232,.5); } 70% { box-shadow: 0 0 0 16px rgba(26,115,232,0); } 100% { box-shadow: 0 0 0 0 rgba(26,115,232,0); } }
  .maplibregl-ctrl-attrib { font-size: 10px; }
  #fail { display: none; position: absolute; inset: 0; align-items: center; justify-content: center; text-align: center; padding: 24px;
          color: #444; font-size: 15px; background: #eef2f4; }
</style>
</head>
<body>
<div id="map"></div>
<div id="fail">Couldn't load the map.<br/>Check your internet connection.</div>
<script>
(function () {
  var C = ${JSON.stringify(config)};
  function send(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    else if (window.parent !== window) window.parent.postMessage(Object.assign({ __vulcaticMap: true }, msg), '*');
  }
  if (typeof maplibregl === 'undefined') {
    document.getElementById('fail').style.display = 'flex';
    window.handleMsg = function () {};
    send({ type: 'error', message: 'offline' });
    return;
  }

  var TIRE = '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10" fill="' + C.ink + '"/>' +
    '<circle cx="12" cy="12" r="5.2" fill="#c9ced6"/><circle cx="12" cy="12" r="2" fill="' + C.ink + '"/>' +
    '<g stroke="' + C.ink + '" stroke-width="1.1"><line x1="12" y1="6.8" x2="12" y2="17.2"/><line x1="6.8" y1="12" x2="17.2" y2="12"/></g>' +
    '<g fill="#5b616c"><rect x="11" y="2" width="2" height="2.4" rx=".6"/><rect x="11" y="19.6" width="2" height="2.4" rx=".6"/>' +
    '<rect x="2" y="11" width="2.4" height="2" rx=".6"/><rect x="19.6" y="11" width="2.4" height="2" rx=".6"/></g></svg>';

  function pinSvg(color) {
    return '<svg viewBox="0 0 44 54" width="44" height="54"><path d="M22 53c-1.2 0-13.5-15.6-17.6-23.4C2.8 26.7 2 23.9 2 21 2 9.95 10.95 1 22 1s20 8.95 20 20c0 2.9-.8 5.7-2.4 8.6C35.5 37.4 23.2 53 22 53z" fill="' +
      color + '" stroke="#fff" stroke-width="2"/></svg>';
  }

  var map = new maplibregl.Map({
    container: 'map', style: C.style, center: C.center, zoom: 10, minZoom: 9, maxZoom: 18,
    maxBounds: C.maxBounds, attributionControl: { compact: true }, pitchWithRotate: false
  });
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();
  map.fitBounds(C.bounds, { padding: 30, duration: 0 });

  var markers = {}; // id -> { marker, el, place }
  var selected = null;
  var meMarker = null;
  var picking = false;

  function setZoomClass() { document.body.classList.toggle('zoomed', map.getZoom() >= 12.5); }
  map.on('zoom', setZoomClass);
  map.on('moveend', function () { var c = map.getCenter(); send({ type: 'center', lat: c.lat, lng: c.lng }); });
  map.on('click', function () { if (!picking) send({ type: 'tap' }); });
  map.on('error', function (e) { if (e && e.error && /style/i.test(String(e.error.message))) send({ type: 'error', message: 'style' }); });

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function makeEl(p) {
    var el = document.createElement('div');
    var isShop = p.kind === 'shop';
    el.className = 'pin';
    el.innerHTML = pinSvg(isShop ? C.orange : C.green) +
      '<div class="face">' + (isShop ? TIRE : '<img src="' + C.gecko + '" alt=""/>') + '</div>' +
      '<div class="label">' + esc(p.name) + '</div>';
    el.addEventListener('click', function (ev) { ev.stopPropagation(); if (!picking) send({ type: 'select', id: p.id }); });
    return el;
  }

  function setPlaces(list) {
    var seen = {};
    list.forEach(function (p) {
      seen[p.id] = true;
      var m = markers[p.id];
      if (m && (m.place.kind !== p.kind || m.place.name !== p.name)) { m.marker.remove(); m = null; }
      if (!m) {
        var el = makeEl(p);
        m = markers[p.id] = { el: el, place: p, marker: new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([p.lng, p.lat]).addTo(map) };
      } else {
        m.marker.setLngLat([p.lng, p.lat]);
      }
      m.place = p;
    });
    Object.keys(markers).forEach(function (id) { if (!seen[id]) { markers[id].marker.remove(); delete markers[id]; } });
    applySelection();
  }

  function applySelection() {
    Object.keys(markers).forEach(function (id) {
      var el = markers[id].el;
      el.classList.toggle('selected', String(selected) === id);
      el.classList.toggle('dim', selected != null && String(selected) !== id);
    });
  }

  window.handleMsg = function (m) {
    if (!m || !m.type) return;
    if (m.type === 'places') setPlaces(m.places || []);
    if (m.type === 'select') {
      selected = m.id;
      applySelection();
      var s = markers[m.id];
      if (s) map.easeTo({ center: [s.place.lng, s.place.lat], zoom: Math.max(map.getZoom(), 13.5), offset: [0, -90], duration: 600 });
    }
    if (m.type === 'me') {
      if (!meMarker) { var d = document.createElement('div'); d.className = 'me'; meMarker = new maplibregl.Marker({ element: d }).setLngLat([m.lng, m.lat]).addTo(map); }
      else meMarker.setLngLat([m.lng, m.lat]);
    }
    if (m.type === 'focus') map.flyTo({ center: [m.lng, m.lat], zoom: m.zoom || 15, duration: 900 });
    if (m.type === 'resetView') map.fitBounds(C.bounds, { padding: 30, duration: 800 });
    if (m.type === 'pickMode') { picking = !!m.on; document.body.classList.toggle('picking', picking); }
  };
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (err) { return; } }
    window.handleMsg(d);
  });

  map.on('load', function () { setZoomClass(); send({ type: 'ready' }); });
})();
</script>
</body>
</html>`;
}
