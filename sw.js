/* Service worker du topo : lecture hors ligne, sans dépendance. Généré par « topo build » :
   VERSION (empreinte du contenu du build) et FILES (fichiers préchargés, relatifs à ce fichier)
   sont remplacés à la publication ; un nouveau build change VERSION, donc le cache.
   FILES : pages, feuilles, scripts, polices, icônes, manifeste et la variante 800 px des photos ;
   les autres tailles sont mises en cache à la volée quand la page les affiche en ligne. */
'use strict';
const VERSION = '23d7fe343c92';
const FILES = ["./","arcenant/coupe-franche.html","arcenant/coups-de-soleil.html","arcenant/debut-histoire.html","arcenant/francofolies.html","arcenant/frigo.html","arcenant/generation-edlinger.html","arcenant/hors-taxe.html","arcenant/index.html","arcenant/la-petite-verte.html","arcenant/les-quatres-piliers.html","arcenant/mur-bowie.html","arcenant/tout-nouveau-tout-beau.html","arcenant/trou-du-duc.html","arcenant/ultime-atome.html","assets/contours.svg","assets/fonts/Kalam-Bold.woff2","assets/fonts/Kalam-Regular.woff2","assets/fonts/LICENSE-OpenSans.txt","assets/fonts/OFL-Kalam.txt","assets/fonts/OpenSans-Bold.woff2","assets/fonts/OpenSans-BoldItalic.woff2","assets/fonts/OpenSans-Italic.woff2","assets/fonts/OpenSans-Regular.woff2","assets/icon-180.png","assets/icon-192.png","assets/icon-512.png","assets/style.css","assets/theme.css","assets/topo.js","bouilland/after-eight.html","bouilland/cdt.html","bouilland/dernier-cri.html","bouilland/index.html","bouilland/la-cabane.html","bouilland/la-cloche.html","bouilland/la-dalle-a-dede-droite.html","bouilland/la-dalle-a-dede-gauche.html","bouilland/le-socle.html","bouilland/ledd.html","bouilland/les-enfants-rois.html","bouilland/les-petites-voies.html","bouilland/rebelle-de-nuit.html","bouilland/sous-sol.html","bouilland/td-moins.html","chatelet/angelus.html","chatelet/droit-d-hauteur.html","chatelet/grain-de-beaute.html","chatelet/index.html","chatelet/johnny-clogg.html","chatelet/la-forge.html","chatelet/les-dentelles-de-ma-muraille.html","chatelet/lezards-deco.html","chatelet/metropolis.html","chatelet/pas-vu-pas-pris.html","chatelet/pointe-a-pitre.html","chatelet/renaissance.html","combe-a-la-vieille/close-combat.html","combe-a-la-vieille/fond-de-combe.html","combe-a-la-vieille/ghost.html","combe-a-la-vieille/grand-cirque-droite.html","combe-a-la-vieille/grand-cirque-gauche.html","combe-a-la-vieille/index.html","combe-a-la-vieille/nouvelle-frontiere.html","combe-a-la-vieille/petit-cirque.html","combe-a-la-vieille/trois-en-un.html","combe-a-la-vieille/voleur-de-corde.html","images/arcenant-coupe-franche-main-800.jpg","images/arcenant-coups-de-soleil-main-800.jpg","images/arcenant-debut-histoire-main-800.jpg","images/arcenant-francofolies-main-800.jpg","images/arcenant-frigo-main-800.jpg","images/arcenant-generation-edlinger-main-800.jpg","images/arcenant-hors-taxe-main-800.jpg","images/arcenant-la-petite-verte-main-800.jpg","images/arcenant-les-quatres-piliers-main-800.jpg","images/arcenant-mur-bowie-main-800.jpg","images/arcenant-panorama-800.jpg","images/arcenant-tout-nouveau-tout-beau-main-800.jpg","images/arcenant-trou-du-duc-main-800.jpg","images/arcenant-ultime-atome-main-800.jpg","images/bouilland-after-eight-main-800.jpg","images/bouilland-cdt-illus0-565.jpg","images/bouilland-cdt-main-800.jpg","images/bouilland-dernier-cri-main-800.jpg","images/bouilland-la-cabane-doxa-800.jpg","images/bouilland-la-cabane-main-800.jpg","images/bouilland-la-cloche-main-800.jpg","images/bouilland-la-dalle-a-dede-gauche-main-800.jpg","images/bouilland-le-socle-droite-800.jpg","images/bouilland-le-socle-main-800.jpg","images/bouilland-ledd-illus0-585.jpg","images/bouilland-ledd-main-800.jpg","images/bouilland-ledd-zoom-800.jpg","images/bouilland-les-enfants-rois-illus0-800.jpg","images/bouilland-les-enfants-rois-illus0-dark-700.png","images/bouilland-les-enfants-rois-main-800.jpg","images/bouilland-les-petites-voies-illus0-561.jpg","images/bouilland-les-petites-voies-main-800.jpg","images/bouilland-panorama-800.jpg","images/bouilland-rebelle-de-nuit-main-800.jpg","images/bouilland-sous-sol-illus0-800.jpg","images/bouilland-sous-sol-main-800.jpg","images/bouilland-td-moins-illus0-768.jpg","images/bouilland-td-moins-main-800.jpg","images/bouilland-vignette-704.jpg","images/chatelet-angelus-main-800.jpg","images/chatelet-droit-d-hauteur-main-800.jpg","images/chatelet-grain-de-beaute-main-800.jpg","images/chatelet-johnny-clogg-main-800.jpg","images/chatelet-la-forge-main-800.jpg","images/chatelet-les-dentelles-de-ma-muraille-main-800.jpg","images/chatelet-lezards-deco-main-800.jpg","images/chatelet-metropolis-main-800.jpg","images/chatelet-panorama-800.jpg","images/chatelet-pas-vu-pas-pris-main-800.jpg","images/chatelet-pointe-a-pitre-main-800.jpg","images/chatelet-renaissance-main-800.jpg","index.html","manifest.webmanifest","voies.html"];
const BASE = new URL('./', self.location).href;
// préfixe propre à ce dossier : plusieurs topos peuvent partager une origine (GitHub Pages)
const PREFIX = 'topo:' + new URL(BASE).pathname + ':';
const CACHE = PREFIX + VERSION;

// Économiseur de données : rien n'est préchargé ; les pages et images vues en ligne
// sont mises en cache à la volée (voir handle).
function saveData() {
  var c = self.navigator && self.navigator.connection;
  return !!(c && c.saveData);
}

var isImage = function (f) { return /(^|\/)images\/[^/]+\.jpg$/.test(f); };

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        if (saveData()) return null;
        var url = function (f) { return new URL(f, BASE); };
        // pages, feuilles, scripts, polices : tout ou rien, contenu frais du serveur (cache: 'reload') ;
        // images : une image qui manque n'empêche pas l'installation, et le cache HTTP du navigateur
        // sert celle que la page vient de charger (pas de second téléchargement)
        var core = FILES.filter(function (f) { return !isImage(f); });
        var imgs = FILES.filter(isImage);
        return c.addAll(core.map(function (f) { return new Request(url(f), { cache: 'reload' }); })).then(function () {
          return imgs.reduce(function (p, f) {
            return p.then(function () { return c.add(url(f)).catch(function () {}); });
          }, Promise.resolve());
        });
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== CACHE; })
          .map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };

// image absente (taille non préchargée) hors ligne : une autre taille de la même image,
// la plus proche de celle demandée (à égalité, la plus grande)
function sibling(cache, url) {
  var m = /^(.*\/images\/.+)-(\d+)\.jpg$/.exec(url.pathname);
  if (!m) return Promise.resolve(null);
  var want = +m[2];
  var re = new RegExp('^' + esc(m[1]) + '-(\\d+)\\.jpg$');
  return cache.keys().then(function (ks) {
    var best = null, bestD = 0;
    ks.forEach(function (r) {
      var k = re.exec(new URL(r.url).pathname);
      if (!k) return;
      var d = Math.abs(+k[1] - want) * 2 - (+k[1] > want ? 1 : 0);
      if (!best || d < bestD) { best = r; bestD = d; }
    });
    return best ? cache.match(best) : null;
  });
}

// Pages, feuilles et scripts : le réseau d'abord (contenu à jour dès la première visite qui
// suit une publication), le cache si le réseau échoue ou tarde (falaise mal couverte) ; la
// réponse fraîche remplace la copie en cache. Images, polices et le reste : le cache d'abord.
var FRESH_TIMEOUT = 3500;
function fresh(req) {
  return /\.(?:html|css|js|json|webmanifest)$/.test(new URL(req.url).pathname) || req.mode === 'navigate' || new URL(req.url).pathname.slice(-1) === '/';
}
function networkFirst(req, url) {
  return caches.open(CACHE).then(function (cache) {
    var cached = function () {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        if (!hit && url.pathname.slice(-1) === '/') return cache.match(new URL('index.html', url));
        return hit;
      });
    };
    var net = fetch(req).then(function (res) {
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    });
    var late = new Promise(function (resolve) {
      setTimeout(function () { cached().then(function (hit) { if (hit) resolve(hit); }); }, FRESH_TIMEOUT);
    });
    return Promise.race([net, late]).catch(function () {
      return cached().then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return cache.match(new URL('index.html', BASE));
        return Response.error();
      });
    });
  });
}

function handle(req, url) {
  if (fresh(req)) return networkFirst(req, url);
  return caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      if (!hit && url.pathname.slice(-1) === '/') return cache.match(new URL('index.html', url));
      return hit;
    }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        // une image vue en ligne (autre taille) reste disponible ensuite ; avec l'économiseur
        // de données, rien n'étant préchargé, toute ressource vue en ligne l'est
        if (res.ok && (isImage(url.pathname) || saveData())) cache.put(req, res.clone());
        return res;
      }).catch(function () {
        return sibling(cache, url).then(function (alt) {
          if (alt) return alt;
          if (req.mode === 'navigate') return cache.match(new URL('index.html', BASE));
          return Response.error();
        });
      });
    });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin || url.href.indexOf(BASE) !== 0) return;
  e.respondWith(handle(req, url));
});
