// ============================================================================
// FOTO'S VAN BOEKPAGINA'S
//
// Waarom niet in localStorage, zoals de rest van de app: daar past ongeveer 5 MB
// in totaal. Eén telefoonfoto is al 2-4 MB, dus twee foto's zouden de opslag
// vullen en je aantekeningen mee de afgrond in trekken. Foto's gaan daarom in
// IndexedDB, dat op een telefoon met honderden MB's overweg kan.
//
// De foto's blijven op dit apparaat. Ze worden nergens heen gestuurd en komen
// dus ook niet op de openbare site terecht — dat is precies wat je wilt bij
// beeld uit een leerboek.
//
// In localStorage staat wel een lichte index (id + titel per categorie). Daarmee
// blijft zoeken en tellen synchroon werken zonder de database te hoeven openen.
// ============================================================================

const FOTO_DB = 'krnFotos';
const FOTO_STORE = 'fotos';
const STORAGE_FOTO_INDEX = 'krnFotoIndex';

// Formaat waarop we bewaren. Een boekpagina van 2000px lange zijde is scherp
// genoeg om vlot te lezen en kost ~300-500 kB in plaats van 3-4 MB.
const MAX_ZIJDE = 2000;
const KWALITEIT = 0.85;
const MAX_THUMB = 420;
const KWALITEIT_THUMB = 0.7;

let fotoIndex = {};        // { catId: [ {id, titel, bytes, ts} ] }
let fotoDbBelofte = null;
let actieveUrls = [];      // object-URL's van wat nu in beeld staat

// ---------- database ----------
function fotoDb() {
  if (fotoDbBelofte) return fotoDbBelofte;
  fotoDbBelofte = new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error('Deze browser heeft geen IndexedDB.'));
    const verzoek = indexedDB.open(FOTO_DB, 1);
    verzoek.onupgradeneeded = () => {
      const db = verzoek.result;
      if (!db.objectStoreNames.contains(FOTO_STORE)) {
        const store = db.createObjectStore(FOTO_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('catId', 'catId', { unique: false });
      }
    };
    verzoek.onsuccess = () => {
      const db = verzoek.result;
      // Staat de app in een ander tabblad open en wil dat de database bijwerken,
      // dan deze verbinding loslaten in plaats van het andere tabblad te blokkeren.
      db.onversionchange = () => { db.close(); fotoDbBelofte = null; };
      resolve(db);
    };
    verzoek.onerror = () => reject(verzoek.error || new Error('Kon de fotodatabase niet openen.'));
  });
  return fotoDbBelofte;
}

function fotoTransactie(modus) {
  return fotoDb().then(db => db.transaction(FOTO_STORE, modus).objectStore(FOTO_STORE));
}

function alsBelofte(verzoek) {
  return new Promise((resolve, reject) => {
    verzoek.onsuccess = () => resolve(verzoek.result);
    verzoek.onerror = () => reject(verzoek.error);
  });
}

// ---------- index in localStorage ----------
function laadFotoIndex() {
  try {
    const rauw = localStorage.getItem(STORAGE_FOTO_INDEX);
    fotoIndex = rauw ? JSON.parse(rauw) : {};
  } catch (e) { fotoIndex = {}; }
  if (!fotoIndex || typeof fotoIndex !== 'object') fotoIndex = {};
}

function bewaarFotoIndex() {
  try { localStorage.setItem(STORAGE_FOTO_INDEX, JSON.stringify(fotoIndex)); }
  catch (e) { /* index kwijt is niet erg: hij wordt hersteld uit de database */ }
}

// Als de index en de database uit de pas lopen (bijv. index gewist), herstellen
// we de index uit wat er echt in de database staat.
function herstelFotoIndex() {
  return fotoTransactie('readonly')
    .then(store => alsBelofte(store.getAll()))
    .then(alles => {
      const nieuw = {};
      alles.forEach(f => {
        if (!nieuw[f.catId]) nieuw[f.catId] = [];
        nieuw[f.catId].push({ id: f.id, titel: f.titel, bytes: f.bytes, ts: f.ts });
      });
      Object.values(nieuw).forEach(l => l.sort((a, b) => a.ts - b.ts));
      fotoIndex = nieuw;
      bewaarFotoIndex();
      return fotoIndex;
    })
    .catch(() => fotoIndex);
}

function fotosVan(catId) {
  return (fotoIndex && fotoIndex[catId]) ? fotoIndex[catId] : [];
}

function aantalFotos() {
  return Object.values(fotoIndex).reduce((t, l) => t + l.length, 0);
}

function fotoBytesTotaal() {
  return Object.values(fotoIndex).reduce(
    (t, l) => t + l.reduce((s, f) => s + (f.bytes || 0), 0), 0);
}

function leesbareOmvang(bytes) {
  if (!bytes) return '0 MB';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' kB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ---------- inlezen en verkleinen ----------
// createImageBitmap zet de foto meteen goed rechtop (EXIF); lukt dat niet, dan
// via een gewone <img>, waar moderne browsers hetzelfde doen.
function laadAfbeelding(bestand) {
  if (window.createImageBitmap) {
    return createImageBitmap(bestand, { imageOrientation: 'from-image' })
      .catch(() => laadViaImg(bestand));
  }
  return laadViaImg(bestand);
}

function laadViaImg(bestand) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(bestand);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Dit bestand is geen leesbare afbeelding.')); };
    img.src = url;
  });
}

function tekenOpMaat(bron, maxZijde, kwaliteit) {
  const bb = bron.width, hh = bron.height;
  const schaal = Math.min(1, maxZijde / Math.max(bb, hh));
  const breedte = Math.max(1, Math.round(bb * schaal));
  const hoogte = Math.max(1, Math.round(hh * schaal));

  const canvas = document.createElement('canvas');
  canvas.width = breedte; canvas.height = hoogte;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bron, 0, 0, breedte, hoogte);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve({ blob, breedte, hoogte }) : reject(new Error('De foto kon niet worden omgezet.')),
      'image/jpeg', kwaliteit
    );
  });
}

// Draaien in stappen van een kwartslag. Bij 90 en 270 wisselen breedte en
// hoogte om, dus het doekje krijgt de omgekeerde maten en de foto wordt
// gedraaid in het midden neergezet.
function tekenGedraaid(bron, graden, maxZijde, kwaliteit) {
  const kwart = ((graden % 360) + 360) % 360;
  const kantelt = (kwart === 90 || kwart === 270);

  let breedte = kantelt ? bron.height : bron.width;
  let hoogte = kantelt ? bron.width : bron.height;
  const schaal = Math.min(1, maxZijde / Math.max(breedte, hoogte));
  breedte = Math.max(1, Math.round(breedte * schaal));
  hoogte = Math.max(1, Math.round(hoogte * schaal));

  const canvas = document.createElement('canvas');
  canvas.width = breedte; canvas.height = hoogte;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.translate(breedte / 2, hoogte / 2);
  ctx.rotate(kwart * Math.PI / 180);

  // maten van de foto zelf, dus vóór het kantelen
  const fotoB = kantelt ? hoogte : breedte;
  const fotoH = kantelt ? breedte : hoogte;
  ctx.drawImage(bron, -fotoB / 2, -fotoH / 2, fotoB, fotoH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve({ blob, breedte, hoogte }) : reject(new Error('De foto kon niet worden gedraaid.')),
      'image/jpeg', kwaliteit
    );
  });
}

// Het draaien wordt echt in de foto vastgelegd — niet alleen in beeld gekanteld.
// Zo staat hij overal goed: in het overzicht, schermvullend én in de back-up.
// Een kwartslag is pixelzuiver; alleen het opnieuw opslaan als JPEG kost iets,
// daarom een hogere kwaliteit dan bij het eerste verkleinen.
const KWALITEIT_DRAAI = 0.92;

function draaiFoto(catId, id, graden) {
  return haalFoto(id).then(record => {
    if (!record) return null;
    return laadAfbeelding(record.blob).then(bron =>
      Promise.all([
        tekenGedraaid(bron, graden, MAX_ZIJDE, KWALITEIT_DRAAI),
        tekenGedraaid(bron, graden, MAX_THUMB, KWALITEIT_THUMB),
      ]).then(([groot, klein]) => {
        if (bron.close) bron.close();
        record.blob = groot.blob;
        record.thumb = klein.blob;
        record.breedte = groot.breedte;
        record.hoogte = groot.hoogte;
        record.bytes = groot.blob.size + klein.blob.size;
        return fotoTransactie('readwrite')
          .then(store => alsBelofte(store.put(record)))
          .then(() => {
            const rij = (fotoIndex[catId] || []).find(f => f.id === id);
            if (rij) { rij.bytes = record.bytes; bewaarFotoIndex(); }
            return record;
          });
      })
    );
  });
}

function verwerkFoto(catId, bestand, titel) {
  return laadAfbeelding(bestand).then(bron =>
    Promise.all([
      tekenOpMaat(bron, MAX_ZIJDE, KWALITEIT),
      tekenOpMaat(bron, MAX_THUMB, KWALITEIT_THUMB),
    ]).then(([groot, klein]) => {
      if (bron.close) bron.close();   // bitmapgeheugen vrijgeven
      const record = {
        catId: catId,
        titel: titel || 'Boekpagina',
        blob: groot.blob,
        thumb: klein.blob,
        breedte: groot.breedte,
        hoogte: groot.hoogte,
        bytes: groot.blob.size + klein.blob.size,
        ts: Date.now(),
      };
      return fotoTransactie('readwrite')
        .then(store => alsBelofte(store.add(record)))
        .then(id => {
          if (!fotoIndex[catId]) fotoIndex[catId] = [];
          fotoIndex[catId].push({ id: id, titel: record.titel, bytes: record.bytes, ts: record.ts });
          bewaarFotoIndex();
          return id;
        });
    })
  );
}

function haalFoto(id) {
  return fotoTransactie('readonly').then(store => alsBelofte(store.get(id)));
}

function verwijderFoto(catId, id) {
  return fotoTransactie('readwrite')
    .then(store => alsBelofte(store.delete(id)))
    .then(() => {
      if (fotoIndex[catId]) {
        fotoIndex[catId] = fotoIndex[catId].filter(f => f.id !== id);
        if (!fotoIndex[catId].length) delete fotoIndex[catId];
        bewaarFotoIndex();
      }
    });
}

// Alle foto's van één aandachtsgebied weggooien — gebruikt als dat gebied zelf
// verwijderd wordt, zodat er niets onzichtbaar blijft staan.
function verwijderFotosVan(catId) {
  const ids = fotosVan(catId).map(f => f.id);
  if (!ids.length) return Promise.resolve(0);

  return fotoTransactie('readwrite')
    .then(store => Promise.all(ids.map(id => alsBelofte(store.delete(id)))))
    .then(() => {
      delete fotoIndex[catId];
      bewaarFotoIndex();
      return ids.length;
    })
    .catch(fout => { console.log('foto\'s verwijderen mislukt:', fout); return 0; });
}

function hernoemFoto(catId, id, titel) {
  return haalFoto(id).then(record => {
    if (!record) return;
    record.titel = titel;
    return fotoTransactie('readwrite')
      .then(store => alsBelofte(store.put(record)))
      .then(() => {
        const rij = (fotoIndex[catId] || []).find(f => f.id === id);
        if (rij) { rij.titel = titel; bewaarFotoIndex(); }
      });
  });
}

// ---------- weergave ----------
function vergeetUrls() {
  actieveUrls.forEach(u => URL.revokeObjectURL(u));
  actieveUrls = [];
}

function renderFotos() {
  const el = document.getElementById('fotoLijst');
  if (!el) return;
  vergeetUrls();

  const lijst = activeId ? fotosVan(activeId) : [];
  toonFotoStatus();

  if (!lijst.length) {
    el.innerHTML = '<div class="video-leeg">Nog geen foto bij dit onderwerp.</div>';
    return;
  }

  el.innerHTML = '<div class="foto-grid">' + lijst.map(f => `
    <figure class="foto-tegel" data-id="${f.id}">
      <button class="foto-open" data-id="${f.id}" title="Groter bekijken">
        <img alt="${esc(f.titel)}" loading="lazy">
      </button>
      <figcaption>
        <span class="foto-titel" data-id="${f.id}" title="Tik om de titel te wijzigen">${esc(f.titel)}</span>
        <button class="foto-del" data-id="${f.id}" title="Foto verwijderen">✕</button>
      </figcaption>
    </figure>
  `).join('') + '</div>';

  // miniaturen ophalen uit de database
  lijst.forEach(f => {
    haalFoto(f.id).then(record => {
      if (!record) return;
      const img = el.querySelector(`.foto-open[data-id="${f.id}"] img`);
      if (!img) return;
      const url = URL.createObjectURL(record.thumb || record.blob);
      actieveUrls.push(url);
      img.src = url;
    }).catch(() => {});
  });

  el.querySelectorAll('.foto-open').forEach(knop => {
    knop.addEventListener('click', () => toonFotoGroot(parseInt(knop.dataset.id, 10)));
  });
  el.querySelectorAll('.foto-del').forEach(knop => {
    knop.addEventListener('click', () => vraagVerwijderFoto(parseInt(knop.dataset.id, 10)));
  });
  el.querySelectorAll('.foto-titel').forEach(span => {
    span.addEventListener('click', () => vraagHernoemFoto(parseInt(span.dataset.id, 10)));
  });
}

function toonFotoStatus() {
  const el = document.getElementById('fotoStatus');
  if (!el) return;
  const totaal = aantalFotos();
  if (!totaal) { el.textContent = ''; return; }
  el.textContent = `${totaal} foto${totaal === 1 ? '' : "'s"} op dit apparaat · ${leesbareOmvang(fotoBytesTotaal())}`;
}

function vraagVerwijderFoto(id) {
  const rij = fotosVan(activeId).find(f => f.id === id);
  if (!rij) return;
  if (!confirm('"' + rij.titel + '" verwijderen?\n\nDe foto wordt van dit apparaat gewist en is daarna weg.')) return;
  verwijderFoto(activeId, id)
    .then(() => { renderFotos(); toast('🗑️ Foto verwijderd'); })
    .catch(() => toast('⚠️ Verwijderen lukte niet'));
}

function vraagHernoemFoto(id) {
  const rij = fotosVan(activeId).find(f => f.id === id);
  if (!rij) return;
  const nieuw = prompt('Titel van deze foto:', rij.titel);
  if (nieuw === null) return;
  const titel = nieuw.trim() || 'Boekpagina';
  hernoemFoto(activeId, id, titel)
    .then(() => { renderFotos(); renderList(document.getElementById('zoek').value); })
    .catch(() => toast('⚠️ Wijzigen lukte niet'));
}

// ---------- groot bekijken ----------
let viewerUrl = null;
let viewerId = null;      // welke foto er nu schermvullend openstaat

function toonFotoGroot(id) {
  const overlay = document.getElementById('fotoViewer');
  const img = document.getElementById('fotoViewerImg');
  const titel = document.getElementById('fotoViewerTitel');
  if (!overlay) return;

  haalFoto(id).then(record => {
    if (!record) return;
    viewerId = id;
    toonInViewer(record);
    overlay.hidden = false;
    document.body.classList.add('viewer-open');
  }).catch(() => toast('⚠️ Deze foto kon niet worden geopend'));
}

function toonInViewer(record) {
  const overlay = document.getElementById('fotoViewer');
  const img = document.getElementById('fotoViewerImg');
  if (viewerUrl) URL.revokeObjectURL(viewerUrl);
  viewerUrl = URL.createObjectURL(record.blob);
  img.src = viewerUrl;
  img.className = '';                    // begin altijd passend in beeld
  overlay.classList.remove('zoomt');
  overlay.scrollTop = 0; overlay.scrollLeft = 0;
  document.getElementById('fotoViewerTitel').textContent = record.titel;
}

function draaiHuidige(graden) {
  if (viewerId === null || !activeId) return;
  const knoppen = [document.getElementById('fotoDraaiLinks'),
                   document.getElementById('fotoDraaiRechts')];
  knoppen.forEach(k => k.disabled = true);

  draaiFoto(activeId, viewerId, graden)
    .then(record => {
      if (record) {
        toonInViewer(record);
        renderFotos();          // ook het miniatuur eronder bijwerken
      }
    })
    .catch(() => toast('⚠️ Draaien lukte niet'))
    .then(() => knoppen.forEach(k => k.disabled = false));
}

function sluitFotoGroot() {
  const overlay = document.getElementById('fotoViewer');
  if (!overlay) return;
  overlay.hidden = true;
  overlay.classList.remove('zoomt');
  document.body.classList.remove('viewer-open');
  const img = document.getElementById('fotoViewerImg');
  img.removeAttribute('src');
  img.className = '';
  viewerId = null;
  if (viewerUrl) { URL.revokeObjectURL(viewerUrl); viewerUrl = null; }
}

// ---------- toevoegen ----------
function kiesFotos(bestanden) {
  if (!activeId || !bestanden || !bestanden.length) return;
  const status = document.getElementById('fotoBezig');
  const lijst = Array.from(bestanden).filter(b => b.type.startsWith('image/'));

  if (!lijst.length) {
    toast('⚠️ Kies een afbeelding');
    return;
  }

  let klaar = 0, mislukt = 0;
  status.textContent = `Bezig… (0 van ${lijst.length})`;
  status.classList.add('show');

  // Zelf getypte titel gaat voor de bestandsnaam. Kies je meerdere foto's bij
  // één titel, dan worden ze genummerd — anders heten ze allemaal hetzelfde.
  const titelVeld = document.getElementById('fotoTitel');
  const eigenTitel = titelVeld.value.trim();

  // Eén voor één: tegelijk verkleinen kost op een telefoon te veel geheugen.
  const catId = activeId;
  lijst.reduce((keten, bestand, i) => keten.then(() => {
    const naam = bestand.name ? bestand.name.replace(/\.[^.]+$/, '') : '';
    const titel = eigenTitel
      ? (lijst.length > 1 ? `${eigenTitel} (${i + 1})` : eigenTitel)
      : (naam || 'Boekpagina');
    return verwerkFoto(catId, bestand, titel)
      .then(() => { klaar++; })
      .catch(fout => {
        mislukt++;
        console.log('foto mislukt:', fout);
        if (fout && (fout.name === 'QuotaExceededError' || /quota/i.test(fout.message || ''))) {
          status.textContent = '⚠️ Er is geen ruimte meer op dit apparaat. Verwijder eerst een paar foto\'s.';
        }
      })
      .then(() => { status.textContent = `Bezig… (${klaar + mislukt} van ${lijst.length})`; });
  }), Promise.resolve()).then(() => {
    status.classList.remove('show');
    status.textContent = '';
    titelVeld.value = '';
    if (activeId === catId) renderFotos();
    renderList(document.getElementById('zoek').value);
    if (klaar) toast(`✅ ${klaar} foto${klaar === 1 ? '' : "'s"} toegevoegd`);
    if (mislukt) toast(`⚠️ ${mislukt} foto${mislukt === 1 ? '' : "'s"} niet gelukt`);
  });
}

// ---------- back-up ----------
// Foto's zijn het enige in deze app dat je niet opnieuw kunt maken, dus ze horen
// in de back-up te kunnen. Ze maken het bestand wel fors groter, daarom een
// keuze in plaats van standaard aan.
function fotosVoorBackup() {
  return fotoTransactie('readonly')
    .then(store => alsBelofte(store.getAll()))
    .then(alles => Promise.all(alles.map(f =>
      blobNaarTekst(f.blob).then(data => ({
        catId: f.catId, titel: f.titel, breedte: f.breedte, hoogte: f.hoogte,
        ts: f.ts, data: data,
      }))
    )));
}

function blobNaarTekst(blob) {
  return new Promise((resolve, reject) => {
    const lezer = new FileReader();
    lezer.onload = () => resolve(lezer.result);
    lezer.onerror = () => reject(lezer.error);
    lezer.readAsDataURL(blob);
  });
}

function tekstNaarBlob(dataUrl) {
  return fetch(dataUrl).then(r => r.blob());
}

// Ontdubbelt op categorie + titel + tijdstip, zodat tweemaal dezelfde back-up
// importeren geen dubbele foto's oplevert.
function zetFotosTerug(fotos) {
  if (!Array.isArray(fotos) || !fotos.length) return Promise.resolve(0);

  const bestaand = new Set();
  Object.entries(fotoIndex).forEach(([catId, lijst]) =>
    lijst.forEach(f => bestaand.add(catId + '|' + f.titel + '|' + f.ts)));

  let toegevoegd = 0;
  return fotos.reduce((keten, f) => keten.then(() => {
    const sleutel = f.catId + '|' + f.titel + '|' + f.ts;
    if (bestaand.has(sleutel)) return;
    return tekstNaarBlob(f.data)
      .then(blob => laadAfbeelding(blob).then(bron =>
        tekenOpMaat(bron, MAX_THUMB, KWALITEIT_THUMB).then(klein => {
          if (bron.close) bron.close();
          return {
            catId: f.catId, titel: f.titel, blob: blob, thumb: klein.blob,
            breedte: f.breedte, hoogte: f.hoogte,
            bytes: blob.size + klein.blob.size, ts: f.ts,
          };
        })
      ))
      .then(record => fotoTransactie('readwrite')
        .then(store => alsBelofte(store.add(record)))
        .then(id => {
          if (!fotoIndex[record.catId]) fotoIndex[record.catId] = [];
          fotoIndex[record.catId].push({ id: id, titel: record.titel, bytes: record.bytes, ts: record.ts });
          bestaand.add(sleutel);
          toegevoegd++;
        }))
      .catch(fout => console.log('foto terugzetten mislukt:', fout));
  }), Promise.resolve()).then(() => { bewaarFotoIndex(); return toegevoegd; });
}

function wisAlleFotos() {
  return fotoTransactie('readwrite')
    .then(store => alsBelofte(store.clear()))
    .then(() => { fotoIndex = {}; bewaarFotoIndex(); });
}

// ---------- opstarten ----------
laadFotoIndex();

// De opslag hierboven wordt ook door emla.html gebruikt; de bediening hieronder
// hoort alleen bij index.html. Daarom staat die achter een controle: zonder die
// knoppen zou dit bestand meteen omvallen op een pagina die alleen de opslag
// nodig heeft.
if (document.getElementById('fotoAddBtn')) koppelFotoUi();

function koppelFotoUi() {

// Index en database kunnen uit de pas lopen (browsergegevens deels gewist).
// Eén keer bij het starten controleren en zo nodig herstellen.
fotoDb().then(() => {
  const inIndex = aantalFotos();
  return fotoTransactie('readonly')
    .then(store => alsBelofte(store.count()))
    .then(inDb => {
      if (inDb !== inIndex) return herstelFotoIndex().then(() => renderFotos());
    });
}).catch(() => { /* geen IndexedDB: knop meldt dat straks zelf */ });

document.getElementById('fotoAddBtn').addEventListener('click', () => {
  document.getElementById('fotoInput').click();
});
document.getElementById('fotoInput').addEventListener('change', e => {
  kiesFotos(e.target.files);
  e.target.value = '';       // dezelfde foto twee keer kunnen kiezen
});
document.getElementById('fotoDraaiLinks').addEventListener('click', () => draaiHuidige(-90));
document.getElementById('fotoDraaiRechts').addEventListener('click', () => draaiHuidige(90));
document.getElementById('fotoViewerSluit').addEventListener('click', sluitFotoGroot);
document.getElementById('fotoViewer').addEventListener('click', e => {
  if (e.target.id === 'fotoViewer') sluitFotoGroot();
});
document.getElementById('fotoViewerImg').addEventListener('click', e => {
  const uit = e.currentTarget.classList.toggle('ingezoomd');
  // ook op de omhullende laag zetten, zodat het scrollen niet van CSS :has()
  // afhangt
  document.getElementById('fotoViewer').classList.toggle('zoomt', uit);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !document.getElementById('fotoViewer').hidden) sluitFotoGroot();
});

}   // einde koppelFotoUi
