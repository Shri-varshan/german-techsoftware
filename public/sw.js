// Service Worker for German Tech Workshop PWA
const CACHE_NAME = 'gt-workshop-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let browser manage network requests directly to ensure live database data is always fresh
});
