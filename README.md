# 🚲 Pedal Patrol
 
An interactive map visualizing Bluebikes station traffic across Boston and Cambridge, built with Mapbox GL JS and D3.js.
 
## Live Demo
 
[View on GitHub Pages](https://be910.github.io/PedalPatrol/) 
 
## Features
 
- **Station traffic circles** — each circle represents a Bluebikes station, sized by total trip volume (arrivals + departures)
- **Departure/arrival color encoding** — circle color indicates whether a station skews toward departures or arrivals
- **Time-of-day filter** — scrub the slider to filter trips within a ±60 minute window around any time of day
- **Bike lane overlay** — existing bike infrastructure for Boston and Cambridge rendered in green
- **Tooltips** — hover any station to see exact trip counts
 
## Data Sources
 
| Dataset | Source |
|---|---|
| Bluebikes station locations | Local CSV (`assets/bluebikes-stations.csv`) |
| Bluebikes trip data (March 2024) | Local CSV (`assets/bluebikes-traffic-2024-03.csv`) |
| Boston bike lanes | [Boston Open Data](https://bostonopendata-boston.opendata.arcgis.com) |
| Cambridge bike facilities | [Cambridge GIS](https://github.com/cambridgegis/cambridgegis_data) |
 
 
## Project Structure
 
```
/
├── index.html
├── style.css
├── map.js
└── assets/
    ├── bluebikes-stations.csv
    └── bluebikes-traffic-2024-03.csv
```
 
## Running Locally
 
1. Clone the repo
2. Serve with any local server (e.g. VS Code Live Server, or `python -m http.server`)
3. Open `http://localhost:5500` (or whichever port your server uses)
 
> Opening `index.html` directly as a `file://` URL will not work — Mapbox and the CSV fetches require a local server.
 
