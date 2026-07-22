# City Walks – selvguidede byvandringer

Mobilvenlig web-app til selvguidede gåture med kort, GPS og dansk/engelsk lydguide.
Bygget som **én HTML-fil** uden frameworks – nem at hoste, nem at ændre.

- **Live:** https://wallin83.github.io/trieste-walk/
- **Repo:** https://github.com/Wallin83/trieste-walk
- **Byer:** Trieste 🇮🇹 · Rhodos' gamle by 🇬🇷 · Køge 🇩🇰

## Filer

| Fil | Formål |
|---|---|
| `index.html` | Hele appen: UI, turdata (fortællinger), kort, GPS, lyd, offline-logik |
| `sw.js` | Service worker: offline-caching af app-skal og kortfliser |

## Funktioner

- Leaflet + OpenStreetMap (og satellitlag), rute og nummererede markører pr. by
- GPS via `watchPosition`; auto-registrering ved ankomst (< 50 m) med toast
- Oplæsning via Web Speech API: sætning-for-sætning-kø med naturlige pauser,
  pause/fortsæt (iOS-venligt via cancel + husket sætningsindeks) og spolbar afspilningslinje
- Dansk/engelsk: alle UI-tekster og alle fortællinger; stemmevalg pr. sprog
  (foretrækker enhanced/premium-stemmer)
- Byvælger ved første åbning – valget huskes; kan skiftes under Indstillinger
- Fremdrift gemmes **pr. by** (gennemført/sprunget over/ankommet)
- Offline: app-skal precaches; knap i Indstillinger forudhenter kortfliser
  (zoom 14–18) for den valgte bys område; "Forny offline-kort" rydder og henter forfra
- Nulstil pr. by (Alle stop) og fuld app-nulstilling (Indstillinger)
- Mørk tilstand følger systemet; kompas (kræver tilladelse på iOS)

## Arkitektur

### Turdata (`TOURS` i index.html)
Hver by er et objekt med `title`, `cityName`, `center`, `zoom`, `summary`, `about`
og `stops[]`. Hvert stop: `id`, `lat`, `lng`, `walkMin` (gåtid til næste stop, 0 = sidste)
samt `name`, `intro`, `lookFor` (array) og `story` – alle som `{da, en}`.
Fortællinger er ca. 230–260 ord, familievenlige (skrevet til en 8-årig), med
små opgaver/spørgsmål og afsnit adskilt af linjeskift (styrer oplæsningspauserne).

### Tilstand (localStorage)
- Nøgle: `city-walks-v2` → `{ lang, rate, volume, tour, tours: { <byId>: {current, completed, skipped, arrivedNotified, offlineReady} } }`
- Migration: findes kun den gamle nøgle `trieste-city-walk-v1`, konverteres den
  automatisk (fremdrift → `tours.trieste`, `tour` sættes til `"trieste"`).
- `tour: null` ⇒ byvælger-overlayet vises ved opstart.

### Service worker (`sw.js`)
- **App-skal m.m.:** network-first med cache-fallback (cache `trieste-app-v1`).
  ⇒ Nye versioner af app/ture hentes automatisk, når der er net, og
  offline-kopien opdateres i baggrunden. Brugerne skal ikke gøre noget.
- **Kortfliser** (tile.openstreetmap.org + arcgisonline): cache-first
  (cache `trieste-tiles-v1`, deles med forudhentningen i index.html).
  ⇒ Fliser fornyes kun via "Forny offline-kort"-knappen.
- Bump `VERSION` i sw.js ved større ændringer for at rydde gammel app-cache.

## Deploy

GitHub Pages serverer `main`-branchens rod. Deploy = overskriv `index.html`
(og evt. `sw.js`) via GitHub API. Kræver et personal access token med
repo-adgang (**gem aldrig tokenet i repoet eller i denne fil**):

```
# 1) Hent nuværende SHA
GET https://api.github.com/repos/Wallin83/trieste-walk/contents/index.html
# 2) Upload ny version (base64-indhold + sha fra trin 1)
PUT https://api.github.com/repos/Wallin83/trieste-walk/contents/index.html
    { "message": "...", "content": "<base64>", "sha": "<sha>" }
```

Pages bygger automatisk efter ca. 1–2 minutter.

## Tjekliste: tilføj en ny by

1. **Rute:** Vælg 8–10 stop i gåafstand (start = slut giver den bedste rundtur).
   Verificér koordinater (fx Google Maps/Places) og anslå `walkMin` mellem stop.
2. **Data:** Tilføj et nyt objekt i `TOURS` (kopiér strukturen fra `rhodos`).
   Skriv `summary`/`about` og alle stop-felter på **både dansk og engelsk**.
3. **Fortællinger:** 230–260 ord pr. stop, familievenlig tone, en lille
   opgave/leg pr. stop, afsnit adskilt med linjeskift. Følsomme emner formidles
   nænsomt og ærligt.
4. **Byvælger:** Tilføj et `tour-card` i `#tourPicker` og en knap i
   Indstillinger → By (kald `setTour('<byId>')`), inkl. flag-emoji. I
   Indstillinger-knappen skal der stå `<br>` mellem flag og bynavn
   (fx `🇩🇰<br>Køge`), ellers ombrydes korte bynavne ikke som de andre
   og ser anderledes ud i layoutet.
5. **Deploy** som beskrevet ovenfor. Offline-download og fremdrift virker
   automatisk for den nye by – ingen ændringer i sw.js nødvendige.

## Kendte begrænsninger

- Oplæsningskvalitet afhænger af telefonens stemmer (hent "Forbedret"-stemme
  under iOS: Indstillinger → Tilgængelighed → Oplæst indhold → Stemmer).
- GPS og offline kræver HTTPS (opfyldt på GitHub Pages).
- "Forny offline-kort" rydder flisecachen for **alle** byer.
