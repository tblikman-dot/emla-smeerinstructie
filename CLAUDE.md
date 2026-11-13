# Emla-smeerinstructie — werkafspraken

Losse app voor één briefje: waar Emla-crème ingesmeerd moet worden voor
botulinetoxine-injecties. Statische pagina op GitHub Pages, publiek maar
`noindex`, zonder inlog. **Geen build, geen framework.** Je opent `index.html`
en het werkt.

Live op https://tblikman-dot.github.io/emla-smeerinstructie/ . De inhoud stond
eerst in `kinderrevalidatie-naslag`; die app verwijst nu hierheen. **Wijzig de
tekst en de foto's alleen hier.**

## Organisatie

Afspraak van de gebruiker, letterlijk:

> Houd deze app zo georganiseerd dat een beginner hem kan lezen. Schermen in
> pages. Gedeelde onderdelen in components. Opslaan en laden in data. Eén taak
> per bestand. Geen bestand boven de 300 regels. Check eerst of iets al bestaat
> voordat je iets nieuws schrijft.

Hoe dat hier uitpakt. Deze app heeft **één scherm**, dus er is geen `pages/`.
De indeling loopt langs dezelfde scheidslijn, maar dan per bestand:

| rol | hier |
|---|---|
| scherm (pages) | `index.html` — de enige pagina, met eigen `<style>` en `<script>` |
| gedeeld (components) | `epictekst.js` (`naarAscii`), `fotos.js` (foto's op het toestel), `anatomie-data.js` |
| opslag (data) | `emla-data.js` (de regio's en de teksten), `sw.js` (offline), IndexedDB via `fotos.js` |

**Check eerst of iets al bestaat.** `naarAscii()` staat in `epictekst.js`, de
hele fotoketen in `fotos.js`, het weghalen van een foto in `haalFotoWeg()`. Niet
opnieuw schrijven en geen tweede kopie maken.

### Wat nu niet klopt

Drie bestanden zitten boven de 300 regels: `index.html` (±1165),
`tests/test_emla.py` (±686) en `fotos.js` (±608). Dat is een bewuste
erfenis — één pagina is één bestand, zodat er geen bouwstap nodig is — maar het
botst met de regel hierboven.

Opsplitsen kan zonder build: de opmaak naar `emla.css`, en het script in
`kaartjes.js` (het keuzeraster), `briefje.js` (het A4) en `markeren.js` (het
vlak op een eigen foto). Dan blijft elk stuk onder de 300. **Dat is nog niet
gedaan.** Doe het in één keer en met de toetsen ernaast, niet half.

## Harde regels

- **Geen patiëntgegevens.** Openbare pagina. Geen naam, geboortedatum of
  patiëntnummer, ook niet als voorbeeld. Bij elk veld waar iets ingevuld wordt
  moet die waarschuwing op het scherm staan. Wat ingevuld wordt, wordt niet
  bewaard en verdwijnt bij het herladen.
- **Verzin geen klinische getallen.** Een afkapwaarde, dosis of interval komt
  uit een bron, of hij komt er niet in. Eerder vragen dan aannemen.
- **Geen bronvermelding.** Niet op het scherm, niet op het briefje, niet in de
  tekst voor het dossier. Uitdrukkelijke keuze; `tests/test_emla.py` valt om als
  er een terugkeert. De herkomst staat alleen in de kop van `emla-data.js`.
  Uitzondering die niet weg kan: de MIT-licentietekst in `anatomie-data.js` —
  die eist de licentie zolang de tekeningen gebruikt worden.
- **De zinnen van de regio's zijn overgetypt, niet herschreven.** Ze staan
  letterlijk in de toets. Verbeter ze niet stilletjes.
- **Geen spiernamen in de tekst voor ouders.** Op het briefje en in de
  dossiertekst staat geen spiernaam. Bij `arts` mag het wel; dat staat alleen op
  het keuzescherm.
- **Geen namen van personen.** Eén uitzondering, met opzet: `© Blikman` rechts
  in de balk. Haal die er niet uit.
- **Geen emoji.** Lijntekeningen in SVG of kale woorden. Er zit een toets op.
- **Overgenomen materiaal alleen met een licentie die publiceren toestaat.** De
  repo is openbaar; zie `LICENSE`.
- **Geen operatietechniek.** De gebruiker is revalidatiearts, geen operateur.

## Bij elke wijziging

- **`CACHE_VERSIE` in `sw.js` omhoog.** Altijd. Anders blijven oude bestanden op
  de telefoon hangen en ziet de gebruiker zijn eigen wijziging niet. Dit is de
  fout die het vaakst gemaakt wordt.
- **Nieuw bestand? Ook in `APP_BESTANDEN` in `sw.js`.** `cache.addAll()` weigert
  in zijn geheel zodra er één 404 tussen zit; dan installeert de service worker
  niet en werkt offline stil niet meer. Er is een toets op.
- **Toetsen draaien.** `python3 -m http.server 9053` in de hoofdmap, dan
  `cd tests && ./alles.sh test_emla.py`. `alles.sh` kijkt ook naar exitcode,
  tracebacks en console-errors, niet alleen naar regels die met FAIL beginnen.
- **Een toets die faalt na een bedoelde wijziging:** eerst nagaan of de code
  klopt, dan de verwachting bijwerken — en in het antwoord zeggen dát de toets
  is aangepast, niet alleen dat alles groen is.
- **Het briefje moet op één A4 passen** bij elk aantal regio's, eenzijdig en
  beidezijdig. A4 is 1123 px bij 96 dpi. Allemaal nagemeten in de toets.
- **Zelf nakijken op telefoonbreedte** (320, 360, 390, 412 px).
- **Het icoon** komt uit `icoon-bron.svg` via `tests/maak-icoon.py`. Teken niet
  in de PNG's; die worden overschreven.

## Wat je hier niet kunt meten

- **`backdrop-filter` vervaagt niets** in de headless browser van de toetsen,
  terwijl hij wél zegt dat hij het ondersteunt. Een schermafbeelding van de
  doorzichtige balk liegt dus. Stel dat niet op het oog bij; beoordeel het op
  een echt toestel.
- **`github.io` is niet bereikbaar** vanuit deze omgeving. Of de pagina live
  staat, kun je hier niet nagaan.

## Git

- Commits gaan direct naar `main`. Geen PR voor deze app.
- Commitberichten in het Nederlands, één regel die zegt wat er inhoudelijk
  verandert.
- Geen modelnaam en geen gegenereerd-door-regel in de code, de commits of de
  pagina's.

## Toon

Nederlands, nuchter, korte zinnen. Geen uitroeptekens, geen marketing.
Onzekerheid wordt benoemd, niet weggeschreven. Wordt er een fout gevonden:
zeggen wat er fout was en doorgaan, zonder uitweiden.
