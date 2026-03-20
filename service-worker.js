const CACHE_NAME='excellent-day-v38';
const SHELL=['/','/index.html','/manifest.json','/icons/icon-192.png','/icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE_NAME).then(c=>Promise.allSettled(SHELL.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))))]));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.hostname.includes('supabase.co')||u.hostname.includes('bible-api.com')||u.hostname.includes('mymemory')){e.respondWith(fetch(e.request).catch(()=>new Response('{}',{headers:{'Content-Type':'application/json'}})));return;}e.respondWith(caches.match(e.request).then(c=>c||fetch(e.request).then(r=>{if(r&&r.status===200){const cl=r.clone();caches.open(CACHE_NAME).then(cc=>cc.put(e.request,cl));}return r;})));});
