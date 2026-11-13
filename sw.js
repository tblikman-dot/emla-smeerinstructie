// Service worker van de losse Emla-app.
// Zelfde opzet als het naslagwerk: netwerk eerst, cache als terugval, zodat je
// online altijd de nieuwste tekst krijgt en offline de laatste die je zag.
//
// Eigen cachenaam. Deze app staat op hetzelfde domein als het naslagwerk, dus
// een gedeelde naam zou de ene de bestanden van de andere laten weggooien.
//
// Let op bij wijzigen: verhoog CACHE_VERSIE, anders blijven oude bestanden hangen.
const CACHE_VERSIE = 'emla-v19';

const APP_BESTANDEN = [
  './',
  './index.html',
  './style.css',
  './emla-data.js',
  './epictekst.js',
  './fotos.js',
  './anatomie-data.js',
  './smeer-lies.webp',
  './smeer-bovenbeen-voor.webp',
  './smeer-bovenbeen-binnen.webp',
  './smeer-bovenbeen-achter.webp',
  './smeer-kuit.webp',
  './smeer-onderbeen-voor.webp',
  './smeer-voet-boven.webp',
  './smeer-voet-binnen.webp',
  './smeer-voet-zool.webp',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSIE)
      .then(cache => cache.addAll(APP_BESTANDEN))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(namen => Promise.all(
        namen.filter(n => n !== CACHE_VERSIE).map(n => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const kopie = res.clone();
          caches.open(CACHE_VERSIE).then(cache => cache.put(req, kopie));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('./index.html');
        return new Response('', { status: 504, statusText: 'Offline' });
      }))
  );
});
