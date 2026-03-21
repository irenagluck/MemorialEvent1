// =============================================
//  SEARCH, AUTOCOMPLETE & GEOCODING
//
//  Handles the top search bar, suggestions
//  dropdown, Google Geocoding API, and the
//  GPS "near me" button.
//  Depends on: state.js, map.js
// =============================================

// =============================================
//  SEARCH
// =============================================

/**
 * Try to find an event matching the search query.
 * If no event name matches, geocode the query and
 * find the nearest event by distance.
 */
function doSearch() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) return;

  const msgEl = document.getElementById('search-message');
  const all   = Object.values(points);

  // Direct name match (partial both ways)
  const exact = all.find(p =>
    p.name === query || p.name.includes(query) || query.includes(p.name)
  );
  if (exact) {
    selectPoint(exact.id);
    msgEl.textContent = 'נמצא: ' + exact.name;
    msgEl.style.color = '#0055cc';
    return;
  }

  // No event match — geocode and find the nearest event
  geocodeAndFindNearest(query);
}

document.getElementById('search-btn').addEventListener('click', doSearch);
document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { hideSuggestions(); doSearch(); }
});

// =============================================
//  AUTOCOMPLETE DROPDOWN
// =============================================

const suggestionsEl = document.getElementById('search-suggestions');

function showSuggestions(query) {
  if (!query || query.length < 1) { hideSuggestions(); return; }

  const matches = Object.values(points).filter(p =>
    p.name.includes(query) || query.includes(p.name)
  );
  if (matches.length === 0) { hideSuggestions(); return; }

  suggestionsEl.innerHTML = matches.map(p =>
    `<div class="suggestion-item" data-id="${p.id}">
       <span>${p.name}</span>
       <span class="suggestion-dist">${p.time} | ${p.location}</span>
     </div>`
  ).join('');
  suggestionsEl.classList.add('visible');

  suggestionsEl.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('click', () => {
      selectPoint(el.dataset.id);
      document.getElementById('search-input').value = points[el.dataset.id].name;
      hideSuggestions();
    });
  });
}

function hideSuggestions() {
  suggestionsEl.classList.remove('visible');
}

document.getElementById('search-input').addEventListener('input', e =>
  showSuggestions(e.target.value.trim())
);
// Close suggestions when clicking anywhere outside the search wrapper
document.addEventListener('click', e => {
  if (!e.target.closest('.search-input-wrapper')) hideSuggestions();
});

// =============================================
//  DISTANCE CALCULATION
// =============================================

/** Haversine formula — returns distance in kilometres. */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
          + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Return the closest point to (lat, lng) and its distance in km. */
function findNearestEvent(lat, lng) {
  let nearest = null, minDist = Infinity;
  Object.values(points).forEach(p => {
    const d = haversineKm(lat, lng, p.lat, p.lng);
    if (d < minDist) { minDist = d; nearest = p; }
  });
  return { point: nearest, distKm: Math.round(minDist * 10) / 10 };
}

// =============================================
//  GEOCODING (Google Geocoding API)
// =============================================

const GOOGLE_MAPS_API_KEY = 'AIzaSyAfNIbaViqyfDQz0DsoDlJh_oLuE72bpd0';

async function geocodeAndFindNearest(query) {
  const msgEl = document.getElementById('search-message');
  msgEl.textContent = 'מחפש מיקום...';
  msgEl.style.color = '#888';
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query + ', ישראל')}&key=${GOOGLE_MAPS_API_KEY}&language=he&region=il`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (data.status !== 'OK' || !data.results.length) {
      msgEl.innerHTML = `לא נמצא מיקום בשם "<strong>${query}</strong>".`;
      return;
    }

    const { lat, lng } = data.results[0].geometry.location;
    const { point, distKm } = findNearestEvent(lat, lng);
    if (!point) { msgEl.textContent = 'אין אירועים במפה עדיין.'; return; }

    selectPoint(point.id);
    msgEl.textContent = `האירוע הקרוב ביותר אליך: ${point.name} (כ-${distKm} ק"מ)`;
    msgEl.style.color = '#0055cc';
  } catch {
    msgEl.textContent = 'שגיאה בחיפוש. נסו שוב.';
    msgEl.style.color = '#c00';
  }
}

// =============================================
//  GPS "NEAR ME" BUTTON
// =============================================

document.getElementById('near-me-btn').addEventListener('click', () => {
  const msgEl = document.getElementById('search-message');

  if (!navigator.geolocation) {
    msgEl.textContent = 'הדפדפן אינו תומך באיתור מיקום.';
    return;
  }

  msgEl.textContent = 'מאתר מיקומך...';
  msgEl.style.color = '#888';

  navigator.geolocation.getCurrentPosition(
    pos => {
      const { point, distKm } = findNearestEvent(pos.coords.latitude, pos.coords.longitude);
      if (!point) { msgEl.textContent = 'אין אירועים במפה עדיין.'; return; }
      selectPoint(point.id);
      msgEl.textContent = `האירוע הקרוב ביותר אליך: ${point.name} (כ-${distKm} ק"מ)`;
      msgEl.style.color = '#0055cc';
    },
    () => {
      msgEl.textContent = 'לא ניתן לאתר מיקום. אנא אפשרו גישה למיקום בדפדפן.';
      msgEl.style.color = '#c00';
    }
  );
});
