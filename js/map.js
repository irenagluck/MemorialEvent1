// =============================================
//  MAP INITIALIZATION
//
//  Sets up Google Maps, exposes helper functions
//  used by locations.js, search.js, and others.
//  Depends on: state.js
// =============================================

// Center on Israel
const map = new google.maps.Map(document.getElementById('map'), {
  center:              { lat: 31.5, lng: 34.9 },
  zoom:                7,
  mapTypeControl:      false,
  fullscreenControl:   false,
  streetViewControl:   false
});

// =============================================
//  CHROME AUTOFILL PREVENTION ON SEARCH INPUT
//
//  Chrome sometimes fills the search box with
//  a saved credential. These hacks stop it.
// =============================================
(function () {
  const input   = document.getElementById('search-input');
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;

  // readonly-on-mousedown blocks the desktop credential popup.
  // Skip on touch devices — readonly prevents the mobile keyboard from opening.
  if (!isTouch) {
    input.addEventListener('mousedown', function () {
      input.setAttribute('readonly', true);
      setTimeout(() => input.removeAttribute('readonly'), 150);
    });
  }

  // Clear any value injected by Chrome autofill (detected via CSS animation).
  input.addEventListener('animationstart', function (e) {
    if (e.animationName === 'autofill-detect') { input.value = ''; }
  });

  // Final fallback: clear if Chrome silently filled an email address.
  setTimeout(() => { if (input.value.includes('@')) input.value = ''; }, 600);
})();

// =============================================
//  CACHED DOM REFERENCES (shared by locations.js)
// =============================================
const locationList = document.getElementById('location-list');
const placeholder  = document.getElementById('panel-placeholder');

// =============================================
//  MAP MARKER HELPERS
// =============================================

/**
 * Build a Google Maps marker icon (filled circle).
 * @param {boolean} highlighted - true for the selected/active marker (red, larger)
 */
function makeIcon(highlighted) {
  return {
    path:        google.maps.SymbolPath.CIRCLE,
    fillColor:   highlighted ? '#ff3300' : '#0055cc',
    fillOpacity: 1,
    strokeColor: 'white',
    strokeWeight: 3,
    scale:       highlighted ? 9 : 7
  };
}

// =============================================
//  EVENT CARD (SIDE PANEL)
// =============================================

/** Populate the side-panel event card with data from a point object. */
function fillEventCard(p) {
  document.getElementById('card-title').textContent      = p.name;
  document.getElementById('card-date').textContent       = p.date;
  document.getElementById('card-time').textContent       = p.time;
  document.getElementById('card-location').textContent   = p.location;
  document.getElementById('card-directions').textContent = p.directions;
  document.getElementById('card-capacity').textContent   = p.capacity;

  const noticeBox = document.getElementById('card-notice');
  noticeBox.textContent   = p.notice || '';
  noticeBox.style.display = p.notice ? 'block' : 'none';

  // Broadcast is appended to the notice field — no separate display needed.
  document.getElementById('card-broadcast').style.display = 'none';

  // Navigate button — links to Google Maps directions for the event location
  const navBtn = document.getElementById('card-navigate-btn');
  navBtn.href         = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  navBtn.style.display = 'block';
}

// =============================================
//  POINT SELECTION
// =============================================

/**
 * Select a point on the map and show its details in the side panel.
 * @param {string} id - Firestore document ID of the point
 */
function selectPoint(id) {
  const p = points[id];
  if (!p) return;

  // Reset all markers to normal, highlight the selected one
  Object.keys(markers).forEach(k => markers[k].setIcon(makeIcon(false)));
  markers[id].setIcon(makeIcon(true));

  map.setCenter({ lat: p.lat, lng: p.lng });
  map.setZoom(13);

  fillEventCard(p);

  placeholder.style.display = 'none';
  document.getElementById('event-card').classList.add('visible');
  activeId = id;
  document.getElementById('search-message').textContent = '';
}
