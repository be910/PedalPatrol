import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
console.log('Mapbox GL JS Loaded:', mapboxgl);

// Set Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoiYW5uMDc2IiwiYSI6ImNtaHU5OGJxYjAxbWYyaW13c2RnbXRuNmsifQ.4Flk4r4n2ofiihpu9nx8ig';

// Initialize map
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-71.09415, 42.36027],
  zoom: 12,
  minZoom: 5,
  maxZoom: 18,
});

let departuresByMinute = Array.from({ length: 1440 }, () => []);
let arrivalsByMinute = Array.from({ length: 1440 }, () => []);

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);
  const { x, y } = map.project(point);
  return { cx: x, cy: y };
}

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);
  return date.toLocaleString('en-US', { timeStyle: 'short' });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterByMinute(tripsByMinute, minute) {
  if (minute === -1) return tripsByMinute.flat();

  const minMinute = (minute - 60 + 1440) % 1440;
  const maxMinute = (minute + 60) % 1440;

  if (minMinute > maxMinute) {
    return tripsByMinute.slice(minMinute).concat(tripsByMinute.slice(0, maxMinute)).flat();
  } else {
    return tripsByMinute.slice(minMinute, maxMinute).flat();
  }
}

let timeFilter = -1;

function computeStationTraffic(stations, timeFilter = -1) {
  const departures = d3.rollup(
    filterByMinute(departuresByMinute, timeFilter),
    v => v.length,
    d => d.start_station_id
  );

  const arrivals = d3.rollup(
    filterByMinute(arrivalsByMinute, timeFilter),
    v => v.length,
    d => d.end_station_id
  );

  return stations.map(station => {
    const id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}

map.on('load', async () => {
  const timeSlider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('time-display');
  const anyTimeLabel = document.getElementById('any-time-label');

  function updateTimeDisplay() {
    timeFilter = Number(timeSlider.value);

    if (timeFilter === -1) {
      selectedTime.style.display = 'none';
      anyTimeLabel.style.display = 'inline';
    } else {
      selectedTime.textContent = formatTime(timeFilter);
      selectedTime.style.display = 'inline';
      anyTimeLabel.style.display = 'none';
    }

    updateScatterPlot(timeFilter);
  }

  // Add bike route layers
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson',
  });

  map.addLayer({
    id: 'bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': '#32D400',
      'line-width': 3.5,
      'line-opacity': 0.6,
    },
  });

  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson',
  });

  map.addLayer({
    id: 'cambridge-bike-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': '#32D400',
      'line-width': 3.5,
      'line-opacity': 0.6,
    },
  });

  let stations, trips;
  let stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);

  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(jsonurl);

    trips = await d3.csv(
      'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv',
      trip => {
        trip.started_at = new Date(trip.started_at);
        trip.ended_at = new Date(trip.ended_at);
        return trip;
      }
    );

    // Populate minute buckets FIRST
    trips.forEach(trip => {
      const startMin = minutesSinceMidnight(trip.started_at);
      departuresByMinute[startMin].push(trip);

      const endMin = minutesSinceMidnight(trip.ended_at);
      arrivalsByMinute[endMin].push(trip);
    });

    // THEN compute station traffic
    stations = computeStationTraffic(jsonData.data.stations);

  } catch (error) {
    console.error('Error loading JSON or CSV:', error);
    return;
  }

  // Create radius scale
  const maxTraffic = d3.max(stations, d => d.totalTraffic);
  console.log('Max traffic on load:', maxTraffic);
  console.log('Sample station traffic:', stations.slice(0, 3).map(s => ({
    name: s.name,
    traffic: s.totalTraffic
  })));

  const radiusScale = d3
    .scaleSqrt()
    .domain([0, maxTraffic])
    .range([0, 20]);

  const svg = d3.select('#map')
    .append('svg')
    .style('position', 'absolute')
    .style('top', 0)
    .style('left', 0)
    .style('width', '100%')
    .style('height', '100%')
    .style('pointer-events', 'none')
    .style('z-index', 1);

  const circles = svg.selectAll('circle')
    .data(stations, d => d.short_name)
    .enter()
    .append('circle')
    .attr('r', d => radiusScale(d.totalTraffic))
    .style('--departure-ratio', d => 
      stationFlow(d.departures / d.totalTraffic)
    );

  circles.append('title')
    .text(d => `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);

  function updatePositions() {
    circles
      .attr('cx', d => getCoords(d).cx)
      .attr('cy', d => getCoords(d).cy);
  }

  function updateScatterPlot(timeFilter) {
    const filteredStations = computeStationTraffic(stations, timeFilter);

    // Update the domain based on filtered data's max traffic
    const maxTraffic = d3.max(filteredStations, d => d.totalTraffic);
    radiusScale
      .domain([0, maxTraffic])
      .range(timeFilter === -1 ? [0, 15] : [3, 25]);

    // Update circle attributes
    circles
      .attr('r', d => radiusScale(d.totalTraffic))
      .style('--departure-ratio', d => 
        stationFlow(d.departures / d.totalTraffic)
      );
    
    // Update tooltips
    circles.select('title')
      .text(d => `${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
  }

  timeSlider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();

  updatePositions();
  map.on('move', updatePositions);
  map.on('zoom', updatePositions);
  map.on('resize', updatePositions);
  map.on('moveend', updatePositions);
});