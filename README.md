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

## Herkomst

- **De tekst** komt van de poster "Waar Emla® insmeren? Voor botulinetoxine-injecties",
  UMCG Centrum voor Revalidatie. Wat er precies is overgenomen, wat op aanwijzing
  van de behandelend arts is gewijzigd en wat er is toegevoegd, staat in de kop
  van `emla-data.js`.
- **De foto's en de voetbeelden** zijn eigen materiaal van de behandelend arts.
- **De anatomische tekeningen** in `anatomie-data.js` komen van `@musclemap/assets`
  (MIT); de licentietekst staat in dat bestand. Ze worden alleen nog als terugval
  gebruikt.

## Zelf draaien

    python3 -m http.server 9053
    cd tests && ./alles.sh test_emla.py

De toets controleert onder meer dat de zinnen letterlijk van de poster zijn,
dat het briefje op één A4 past bij elk aantal regio's, welke kant gespiegeld
wordt, en dat er niets wordt bewaard.

## Bij elke wijziging

Verhoog `CACHE_VERSIE` in `sw.js`. Anders blijven oude bestanden op de telefoon
hangen en zie je je eigen wijziging niet.
