import { SIARGAO_BOUNDS } from '@/lib/places';
import { brand } from '@/lib/theme';

import { GECKO_MARKER_DATA_URI } from './geckoMarker';
import { MAPLIBRE_CSS, MAPLIBRE_JS } from './maplibreBundle';

/**
 * The map runs inside a WebView using MapLibre GL JS (open source) with free
 * OpenFreeMap tiles built from OpenStreetMap data: no API key, no usage limits.
 *
 * Messages in  (from the app):  places, me, select, focus, resetView, pickMode, view3d
 * Messages out (to the app):    ready, select, tap, center, error
 */
// Colorful in dark mode too: the dark styles were too dim to read outdoors. Has 3D buildings up close.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
/** Free, keyless ground heights (AWS open data) for the 3D hills. */
const HEIGHTS_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

export function buildMapHtml() {
  const [w, s, e, n] = SIARGAO_BOUNDS;
  const pad = 0.06;
  const config = {
    style: STYLE_URL,
    heights: HEIGHTS_URL,
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
<style>${MAPLIBRE_CSS}</style>
<script>${MAPLIBRE_JS}</script>
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #dfe9ef; }
  body { font-family: -apple-system, system-ui, Roboto, 'Segoe UI', sans-serif; -webkit-tap-highlight-color: transparent; }
  /* No position or transform here: MapLibre uses both to place the pin exactly. */
  .pin { width: 44px; height: 54px; cursor: pointer; }
  .body { position: absolute; inset: 0; transition: transform .18s ease; transform-origin: 50% 98%; }
  .body > svg { position: absolute; inset: 0; filter: drop-shadow(0 3px 4px rgba(0,0,0,.35)); }
  .pin .face svg { display: block; }
  .pin .face { position: absolute; left: 7px; top: 6px; width: 30px; height: 30px; border-radius: 50%; background: #fff;
               display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .pin .face img { width: 30px; height: 30px; object-fit: contain; margin-top: 4px; }
  .pin.selected { z-index: 5; }
  .pin.selected .body { transform: scale(1.3); }
  .pin .face img.photo { width: 100%; height: 100%; object-fit: cover; margin: 0; }
  #cross { display: none; position: absolute; left: 50%; top: 50%; width: 44px; height: 54px; margin: -53px 0 0 -22px; pointer-events: none; filter: drop-shadow(0 3px 4px rgba(0,0,0,.35)); }
  body.picking #cross { display: block; }
  .me.photo { width: 40px; height: 40px; box-sizing: border-box; background-size: cover; background-position: center; }
  .pin.dim { opacity: .55; }
  .label { position: absolute; top: 55px; left: 50%; transform: translateX(-50%); white-space: nowrap; font-size: 11px; font-weight: 700;
           color: ${brand.ink}; background: rgba(255,255,255,.92); padding: 2px 6px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.2);
           display: none; max-width: 150px; overflow: hidden; text-overflow: ellipsis; }
  body.zoomed .label, .pin.selected .label { display: block; }
  .open-dot { position: absolute; right: 1px; top: 1px; width: 11px; height: 11px; border-radius: 50%; background: #0B7A22; border: 2px solid #fff; }
  .cluster { width: 46px; height: 46px; border-radius: 50%; background: ${brand.ink}; color: #fff; border: 3px solid #fff; box-sizing: border-box;
             display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 800; box-shadow: 0 3px 8px rgba(0,0,0,.35); cursor: pointer; }
  @media (prefers-reduced-motion: reduce) { .me { animation: none !important; } .body { transition: none !important; } }
  .me { width: 18px; height: 18px; border-radius: 50%; background: #1A73E8; border: 3px solid #fff; box-shadow: 0 0 0 0 rgba(26,115,232,.5);
        animation: pulse 2s infinite; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(26,115,232,.5); } 70% { box-shadow: 0 0 0 16px rgba(26,115,232,0); } 100% { box-shadow: 0 0 0 0 rgba(26,115,232,0); } }
  .maplibregl-ctrl-attrib { font-size: 10px; }
  .maplibregl-ctrl-bottom-left { bottom: 76px; max-width: calc(100% - 76px); } /* keep the map credit above the bottom button */
  #fail { display: none; position: absolute; inset: 0; align-items: center; justify-content: center; text-align: center; padding: 24px;
          color: #444; font-size: 15px; background: #eef2f4; }
</style>
</head>
<body>
<div id="map"></div>
<div id="cross"></div>
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
    container: 'map', style: C.style, bounds: C.bounds, fitBoundsOptions: { padding: 30 }, minZoom: 9, maxZoom: 18,
    maxBounds: C.maxBounds, attributionControl: false, pitchWithRotate: false, pitch: 45, maxPitch: 60
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
  // The map credit opens by itself, then folds into its (i) button so it doesn't cover the map.
  setTimeout(function () { var c = document.querySelector('.maplibregl-ctrl-attrib'); if (c) { c.classList.remove('maplibregl-compact-show'); c.removeAttribute('open'); } }, 6000);
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();

  document.getElementById('cross').innerHTML = pinSvg(C.orange);

  var markers = {}; // id -> { marker, el, place }
  var clusters = [];
  var selected = null;
  var meMarker = null;
  var picking = false;
  var want3d = true;

  // Choosing a spot is always flat, so the pin tip is exactly on the saved place.
  function applyView() {
    var on = want3d && !picking;
    if (map.getSource('heights')) map.setTerrain(on ? { source: 'heights', exaggeration: 1.6 } : null);
    map.easeTo({ pitch: on ? 45 : 0, duration: 500 });
  }

  // Brighter colors than the standard style, plus hill shading and 3D ground.
  map.on('style.load', function () {
    var colors = {
      background: ['background-color', '#F6F1E3'], water: ['fill-color', '#35B9F1'], landcover_wood: ['fill-color', '#8FD67A'],
      landcover_grass: ['fill-color', '#B7E58E'], park: ['fill-color', '#9FE08A'], landcover_sand: ['fill-color', '#FFE6A3'],
      landuse_school: ['fill-color', '#FFE9B8'], landuse_hospital: ['fill-color', '#FFD3DC'], building: ['fill-color', '#F3C9A5']
    };
    Object.keys(colors).forEach(function (id) { if (map.getLayer(id)) map.setPaintProperty(id, colors[id][0], colors[id][1]); });
    if (map.getLayer('building-3d')) {
      map.setPaintProperty('building-3d', 'fill-extrusion-color', ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 5], 0, '#FFD9B3', 10, '#FFB98A', 30, '#F08A7B']);
      map.setPaintProperty('building-3d', 'fill-extrusion-opacity', 0.9);
    }
    var first = map.getStyle().layers.find(function (l) { return l.type === 'line' || l.type === 'symbol'; });
    ['heights', 'shade'].forEach(function (id) {
      if (!map.getSource(id)) map.addSource(id, { type: 'raster-dem', tiles: [C.heights], encoding: 'terrarium', tileSize: 256, maxzoom: 13, attribution: 'Heights: AWS Terrain Tiles' });
    });
    if (!map.getLayer('hills')) map.addLayer({ id: 'hills', type: 'hillshade', source: 'shade', paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#3B6B3A' } }, first && first.id);
    applyView();
  });

  function setZoomClass() { document.body.classList.toggle('zoomed', map.getZoom() >= 12.5); }
  map.on('zoom', setZoomClass);
  map.on('zoomend', group);
  map.on('pitchend', group);
  function sendCenter() { var c = map.getCenter(); send({ type: 'center', lat: c.lat, lng: c.lng }); }
  map.on('moveend', sendCenter);
  map.on('click', function () { if (!picking) send({ type: 'tap' }); });
  map.on('error', function (e) { if (e && e.error && /style/i.test(String(e.error.message))) send({ type: 'error', message: 'style' }); });

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function asButton(el, name) {
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', name);
    el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); el.click(); } });
  }

  // Pins that would overlap on screen become one circle with a number. Tapping it zooms in.
  function group() {
    clusters.forEach(function (c) { c.remove(); });
    clusters = [];
    var groups = [];
    Object.keys(markers).forEach(function (id) {
      var m = markers[id];
      m.el.style.display = '';
      if (String(selected) === id || map.getZoom() >= 15) return;
      var pt = map.project([m.place.lng, m.place.lat]);
      var g = groups.find(function (x) { return Math.hypot(x.pt.x - pt.x, x.pt.y - pt.y) < 44; });
      if (g) g.items.push(m); else groups.push({ pt: pt, items: [m] });
    });
    groups.forEach(function (g) {
      if (g.items.length < 2) return;
      var b = new maplibregl.LngLatBounds();
      g.items.forEach(function (m) { m.el.style.display = 'none'; b.extend([m.place.lng, m.place.lat]); });
      var el = document.createElement('div');
      el.className = 'cluster';
      el.textContent = g.items.length;
      asButton(el, g.items.length + ' places, tap to zoom in');
      el.addEventListener('click', function (ev) { ev.stopPropagation(); map.fitBounds(b, { padding: 90, maxZoom: 16 }); });
      clusters.push(new maplibregl.Marker({ element: el }).setLngLat(b.getCenter()).addTo(map));
    });
  }

  function makeEl(p) {
    var el = document.createElement('div');
    var isShop = p.kind === 'shop';
    el.className = 'pin';
    asButton(el, p.name);
    var plain = isShop ? TIRE : '<img src="' + C.gecko + '" alt=""/>';
    el.innerHTML = '<div class="body">' + pinSvg(isShop ? C.orange : C.green) +
      '<div class="face">' + (p.photo ? '<img class="photo" src="' + esc(p.photo) + '" alt=""/>' : plain) + '</div>' +
      (p.open === true ? '<div class="open-dot"></div>' : '') +
      '<div class="label">' + esc(p.name) + '</div></div>';
    var img = el.querySelector('img.photo');
    if (img) img.onerror = function () { img.parentNode.innerHTML = plain; };
    el.addEventListener('click', function (ev) { ev.stopPropagation(); if (!picking) send({ type: 'select', id: p.id }); });
    return el;
  }

  function setPlaces(list) {
    var seen = {};
    list.forEach(function (p) {
      seen[p.id] = true;
      var m = markers[p.id];
      if (m && (m.place.kind !== p.kind || m.place.name !== p.name || m.place.open !== p.open || m.place.photo !== p.photo)) { m.marker.remove(); m = null; }
      if (!m) {
        var el = makeEl(p);
        m = markers[p.id] = { el: el, place: p, marker: new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, 1] }).setLngLat([p.lng, p.lat]).addTo(map) };
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
    group();
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
      var meEl = meMarker.getElement();
      meEl.classList.toggle('photo', !!m.photo);
      meEl.style.backgroundImage = m.photo ? 'url(' + JSON.stringify(m.photo) + ')' : '';
    }
    if (m.type === 'focus') map.flyTo({ center: [m.lng, m.lat], zoom: m.zoom || 15, duration: 900 });
    if (m.type === 'resetView') map.fitBounds(C.bounds, { padding: 30, duration: 800 });
    if (m.type === 'pickMode' && picking !== !!m.on) { picking = !!m.on; document.body.classList.toggle('picking', picking); applyView(); }
    if (m.type === 'view3d' && want3d !== !!m.on) { want3d = !!m.on; applyView(); }
  };
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (typeof d === 'string') { try { d = JSON.parse(d); } catch (err) { return; } }
    window.handleMsg(d);
  });

  // Not 'load': pins should show even while map images are still arriving on slow internet.
  map.once('style.load', function () { setZoomClass(); sendCenter(); send({ type: 'ready' }); });
})();
</script>
</body>
</html>`;
}
