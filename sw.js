// Service worker for dancing-skeletons.github.io
// indexing.js injects the cache version (build timestamp) and the list of
// song pages to precache, replacing __CACHE_VERSION__ / __PRECACHE_URLS__.

const CACHE = 'dusc-1795625107873';

const CORE = [
  './',
  'index.html',
  'styles.css',
  'md_renderer.js',
  'sw-register.js',
  'manifest.webmanifest',
  'minimal.md',
  'tools/tuner.html',
  'tools/editor.html',
  'tools/backing-track.html'
];

const EXTRA = ["ukulele/songs/a_la_faveur.html","ukulele/songs/ainsi_soit_il.html","ukulele/songs/aline.html","ukulele/songs/all_of_me.html","ukulele/songs/autumn_leaves.html","ukulele/songs/autumn_leaves2.html","ukulele/songs/be_my_baby.html","ukulele/songs/bei_mir_1.html","ukulele/songs/bei_mir_2.html","ukulele/songs/belle_ile.html","ukulele/songs/blue_drag.html","ukulele/songs/breakfast_in_america.html","ukulele/songs/cant_take.html","ukulele/songs/chanson_de_prevert.html","ukulele/songs/cocoon.html","ukulele/songs/cold_little_hearth.html","ukulele/songs/comme_un_boomerang.html","ukulele/songs/creep.html","ukulele/songs/dont_worry.html","ukulele/songs/dont_you.html","ukulele/songs/emmenez-moi.html","ukulele/songs/enjoy_ride.html","ukulele/songs/fais_oiseau.html","ukulele/songs/have_you_ever_seen_the_rain.html","ukulele/songs/hearth_of_gold.html","ukulele/songs/heroes.html","ukulele/songs/holding_out.html","ukulele/songs/hotel_california_v1.html","ukulele/songs/hotel_california_v2.html","ukulele/songs/how_deep.html","ukulele/songs/il_a_neige.html","ukulele/songs/jardin_hiver.html","ukulele/songs/just_the_two_of_us.html","ukulele/songs/just_the_two_of_us_v2.html","ukulele/songs/la_bamba_twist.html","ukulele/songs/le_sud.html","ukulele/songs/les_petits_papiers.html","ukulele/songs/let_it_be.html","ukulele/songs/life_on_mars.html","ukulele/songs/magnolias_forever.html","ukulele/songs/new_york_avec_toi.html","ukulele/songs/oiseau_et_enfant.html","ukulele/songs/old_man.html","ukulele/songs/people_are_strange.html","ukulele/songs/please_dont_talk.html","ukulele/songs/resiste.html","ukulele/songs/rise.html","ukulele/songs/society.html","ukulele/songs/sunny_afternoon.html","ukulele/songs/sunshine.html","ukulele/songs/sunshine2.html","ukulele/songs/symphonie_eclairs.html","ukulele/songs/symphonie_eclairs2.html","ukulele/songs/tender.html","ukulele/songs/tes_beau.html","ukulele/songs/the_man_who_sold_the_world.html","ukulele/songs/the_times_are_changin.html","ukulele/songs/time_in_a_bottle.html","ukulele/songs/tombe_du_ciel.html","ukulele/songs/wanna_be_like_you.html","ukulele/songs/wellerman.html","ukulele/songs/what_a_wonderful_world.html","ukulele/songs/whats_up.html","ukulele/songs/wild_world.html","ukulele/songs/zephyr_song.html","guitar/songs/hearth_of_gold.html","guitar/songs/knocking.html","guitar/songs/let_it_be.html","guitar/songs/stand_by_me.html","guitar/songs/whats_up.html","guitar/songs/zombie.html","tools/backing-track.html","tools/editor.html","tools/tuner.html"];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(CORE.concat(EXTRA)))
    // no skipWaiting here: the "MAJ" button in sw-register.js applies updates
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // Same-origin: cache-first (precache + pages visited earlier), network
    // fills the cache, offline falls back to the cached songbook index.
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() =>
            caches.match(req).then((h) => h || caches.match('index.html'))
          );
      })
    );
  } else {
    // CDN (chord diagrams, verovio, fonts...): network-first so they stay
    // fresh, but cache successful responses so they work offline after the
    // first visit.
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
  }
});
