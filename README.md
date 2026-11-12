# Emla-smeerinstructie

Een los briefje voor ouders: waar Emla-crème ingesmeerd moet worden voor
botulinetoxine-injecties. Je vinkt de regio's aan, kiest links of rechts, en
print het als A4 of als pdf. Er is ook een versie als platte tekst om in het
dossier te plakken.

Dit is een statische pagina: geen server, geen inlog, geen account.

## Dit is de enige plek

De inhoud stond eerst in het naslagwerk `kinderrevalidatie-naslag`. Die app
verwijst nu hierheen. **Wijzig de tekst of de foto's dus alleen hier** — op twee
plekken bijhouden loopt gegarandeerd uiteen.

## Geen patiëntgegevens

De pagina staat op een openbaar adres (wel `noindex`, dus niet in zoekmachines).
Wat je invult wordt nergens bewaard en verdwijnt als je de pagina sluit. Eigen
foto's die je toevoegt blijven op je eigen toestel staan en worden niet verstuurd.

## Geen bronvermelding

De app noemt nergens een bron: niet op het scherm, niet op het briefje en niet
in de tekst voor het dossier. Dat is een uitdrukkelijke keuze. Zet er dus geen
bronregel terug; `tests/test_emla.py` valt om als dat toch gebeurt.

Wat er over de tekst te weten valt — wat overgetypt is, wat op aanwijzing van de
arts gewijzigd is en welke regio een toevoeging is — staat in de kop van
`emla-data.js`. De foto's en de voetbeelden zijn eigen materiaal.

Eén uitzondering, en die kan niet weg: de MIT-licentietekst in
`anatomie-data.js`. De anatomische tekeningen komen uit `@musclemap/assets`, en
die licentie eist dat de tekst in het bestand blijft staan zolang ze gebruikt
worden. Op het scherm staat er niets over. Wil je ook dat weg, dan moeten de
tekeningen eruit — ze zijn inmiddels alleen nog terugval voor regio's zonder foto.

## Op het startscherm zetten

Er is geen app uit een store en er hoeft niets geïnstalleerd te worden. De pagina
is een PWA: een eigen tegel, zonder adresbalk, en hij werkt offline.

- **Android, in Chrome:** menu rechtsboven → *App installeren* of *Toevoegen aan
  startscherm*.
- **iPhone, in Safari:** deelknop → *Zet op beginscherm*. Dit moet in Safari;
  Chrome op iOS kan het niet.

## Het icoon

De tekening staat in `icoon-bron.svg`. De PNG's worden daaruit gemaakt:

    cd tests && python3 -I maak-icoon.py

Teken dus niet in de PNG's — die worden overschreven. Er komen vier bestanden
uit: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (Android legt daar
zelf een ronde of vierkante mal overheen, dus die versie staat kleiner in het
vlak) en `apple-touch-icon.png` voor de iPhone. Nieuwe bestanden horen ook in
`APP_BESTANDEN` in `sw.js`.

## Zelf draaien

    python3 -m http.server 9053
    cd tests && ./alles.sh test_emla.py

De toets controleert onder meer dat de zinnen ongewijzigd zijn, dat er nergens
een bron staat, dat het briefje op één A4 past bij elk aantal regio's, welke
kant gespiegeld wordt, en dat er niets wordt bewaard.

Ook getoetst: dat elk bestand in `APP_BESTANDEN` echt bestaat. Dat luistert
nauw — `cache.addAll()` weigert in zijn geheel zodra er één 404 tussen zit, en
dan installeert de service worker niet en werkt offline stilletjes niet meer.

## Bij elke wijziging

Verhoog `CACHE_VERSIE` in `sw.js`. Anders blijven oude bestanden op de telefoon
hangen en zie je je eigen wijziging niet.
