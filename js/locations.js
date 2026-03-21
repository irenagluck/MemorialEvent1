// =============================================
//  LOCATION MANAGEMENT
//
//  Firestore real-time listener for the
//  'locations' collection, and the admin
//  add / edit / delete location workflow.
//  Depends on: config.js, state.js, map.js
// =============================================

// =============================================
//  FIRESTORE REAL-TIME LISTENER
// =============================================

placeholder.innerHTML = '<span class="icon">&#8987;</span>טוען נתונים...';

// =============================================
//  PLACES AUTOCOMPLETE (address field in modal)
// =============================================

let previewMarker = null;  // Temporary marker shown while the modal is open

// Bound once to the f-location input; updates pendingLatLng when an address is chosen.
const _locAutocomplete = new google.maps.places.Autocomplete(
  document.getElementById('f-location'),
  { componentRestrictions: { country: 'il' }, fields: ['geometry', 'name', 'formatted_address'] }
);

_locAutocomplete.addListener('place_changed', () => {
  const place = _locAutocomplete.getPlace();
  if (!place.geometry || !place.geometry.location) return;

  const lat = place.geometry.location.lat();
  const lng = place.geometry.location.lng();
  pendingLatLng = { lat, lng };

  document.getElementById('modal-coords').textContent =
    'מיקום שנבחר: ' + lat.toFixed(5) + ', ' + lng.toFixed(5);

  // Show / move the preview marker
  if (previewMarker) {
    previewMarker.setPosition({ lat, lng });
  } else {
    previewMarker = new google.maps.Marker({
      position: { lat, lng },
      map,
      icon:  makeIcon(true),
      title: place.name || place.formatted_address || ''
    });
  }

  // Pan the map to the selected location
  map.setCenter({ lat, lng });
  map.setZoom(15);
});

/** Add a newly loaded point to the map and the side-panel list. */
function addPointToUI(p) {
  // Map marker
  const marker = new google.maps.Marker({
    position: { lat: p.lat, lng: p.lng },
    map,
    icon:  makeIcon(false),
    title: p.name
  });
  marker.addListener('click', () => selectPoint(p.id));
  markers[p.id] = marker;

  // Side-panel list item
  const li = document.createElement('li');
  li.id = 'li-' + p.id;
  li.innerHTML = `
    <span class="loc-dot"></span>
    <div>
      <div class="loc-name">${p.name}</div>
      <div class="loc-sub">${p.time} | ${p.location}</div>
    </div>`;
  li.addEventListener('click', () => selectPoint(p.id));
  locationList.appendChild(li);

  // Admin panel event-filter dropdown
  const opt = document.createElement('option');
  opt.value       = p.id;
  opt.textContent = p.name;
  document.getElementById('filter-event-select').appendChild(opt);
}

/** Refresh side-panel text, position, and tooltip when a point is modified in Firestore. */
function updatePointInUI(p) {
  if (markers[p.id]) {
    markers[p.id].setTitle(p.name);
    markers[p.id].setPosition({ lat: p.lat, lng: p.lng });
  }

  const li = document.getElementById('li-' + p.id);
  if (li) {
    li.querySelector('.loc-name').textContent = p.name;
    li.querySelector('.loc-sub').textContent  = p.time + ' | ' + p.location;
  }

  // Refresh the side card if this point is currently shown
  if (activeId === p.id) fillEventCard(p);
}

db.collection('locations').onSnapshot(
  snapshot => {
    snapshot.docChanges().forEach(change => {
      const p = { id: change.doc.id, ...change.doc.data() };
      if (change.type === 'added') {
        points[p.id] = p;
        addPointToUI(p);
      } else if (change.type === 'modified') {
        points[p.id] = p;
        updatePointInUI(p);
      }
    });

    // Update placeholder text once data has loaded
    if (!activeId) {
      const count = Object.keys(points).length;
      placeholder.innerHTML = count === 0
        ? '<span class="icon">&#128205;</span>עדיין אין אירועים רשומים.<br/>לחצו "+ הוספת מיקום" כדי להתחיל.'
        : '<span class="icon">&#128205;</span>לחצו על נקודה במפה<br/>או חפשו ישוב<br/>כדי לראות פרטי האירוע';
    }
  },
  err => {
    placeholder.innerHTML = `<span class="icon">&#9888;</span>שגיאה בטעינת הנתונים.<br/><small style="color:#c00">${err.code}</small>`;
  }
);

// =============================================
//  ADD / EDIT LOCATION MODAL (admin)
// =============================================

// Cached DOM references used throughout this section
const addBtn     = document.getElementById('add-location-btn');
const mapWrapper = document.getElementById('map-wrapper');
const addBanner  = document.getElementById('add-mode-banner');
const addModal   = document.getElementById('add-modal');

// --- Add-mode toggle ---

function enterAddMode() {
  addMode = true;
  addBtn.textContent = '✕ ביטול';
  addBtn.classList.add('active');
  mapWrapper.classList.add('add-mode');
  addBanner.classList.add('visible');
}

function exitAddMode() {
  addMode       = false;
  pendingLatLng = null;
  if (previewMarker) { previewMarker.setMap(null); previewMarker = null; }
  addBtn.textContent = '+ הוספת מיקום';
  addBtn.classList.remove('active');
  mapWrapper.classList.remove('add-mode');
  addBanner.classList.remove('visible');
}

addBtn.addEventListener('click', () => {
  if (addMode) exitAddMode(); else enterAddMode();
});

// When the user clicks on the map while in add mode, open the add form
map.addListener('click', e => {
  if (!addMode) return;
  addBanner.classList.remove('visible');
  openAddModal(e.latLng.lat(), e.latLng.lng());
});

// --- Open add modal (new location) ---

function openAddModal(lat, lng) {
  editingId     = null;
  pendingLatLng = { lat, lng };

  document.getElementById('add-modal-title').textContent = 'הוספת מיקום חדש';
  document.getElementById('modal-coords').textContent    = 'מיקום שנבחר: ' + lat.toFixed(5) + ', ' + lng.toFixed(5);

  // Clear all form fields
  ['f-name', 'f-location', 'f-directions', 'f-capacity', 'f-notice'].forEach(
    id => { document.getElementById(id).value = ''; }
  );
  document.getElementById('f-date').value = '';
  document.getElementById('f-time').value = '20:00';
  document.getElementById('modal-delete-btn').style.display = 'none';
  document.querySelectorAll('#add-modal .form-error').forEach(el => el.style.display = 'none');

  addModal.classList.add('visible');
  document.getElementById('f-name').focus();
}

// --- Open edit modal (existing location) ---

function openEditModal(id) {
  const p = points[id];
  if (!p) return;

  editingId     = id;
  pendingLatLng = { lat: p.lat, lng: p.lng };

  document.getElementById('add-modal-title').textContent = 'עריכת מיקום – ' + p.name;
  document.getElementById('modal-coords').textContent    = 'מיקום קיים: ' + p.lat.toFixed(5) + ', ' + p.lng.toFixed(5);

  document.getElementById('f-name').value       = p.name;
  document.getElementById('f-location').value   = p.location;
  document.getElementById('f-directions').value = p.directions !== '—' ? p.directions : '';
  document.getElementById('f-capacity').value   = p.capacity   !== '—' ? p.capacity   : '';
  document.getElementById('f-notice').value     = p.notice || '';
  document.getElementById('f-time').value       = p.time;
  document.getElementById('f-date').value       = ''; // keep existing formatted date unless user changes it

  const delBtn = document.getElementById('modal-delete-btn');
  delBtn.disabled    = false;
  delBtn.textContent = '🗑 מחק מיקום';
  delBtn.style.display = 'inline-block';

  document.querySelectorAll('#add-modal .form-error').forEach(el => el.style.display = 'none');
  addModal.classList.add('visible');
}

document.getElementById('edit-location-btn').addEventListener('click', () => {
  if (activeId) openEditModal(activeId);
});

// --- Modal close / cancel ---

document.getElementById('modal-close-btn').addEventListener('click', () => {
  closeModal('add-modal');
  exitAddMode();
});
document.getElementById('modal-cancel-btn').addEventListener('click', () => {
  closeModal('add-modal');
  exitAddMode();
});
addModal.addEventListener('click', e => {
  if (e.target === addModal) { closeModal('add-modal'); exitAddMode(); }
});

// --- Delete location ---

document.getElementById('modal-delete-btn').addEventListener('click', async () => {
  if (!editingId) return;
  const p = points[editingId];
  if (!confirm(`למחוק את האירוע "${p.name}"? פעולה זו אינה הפיכה.`)) return;

  const btn = document.getElementById('modal-delete-btn');
  btn.disabled    = true;
  btn.textContent = 'מוחק...';

  try {
    await db.collection('locations').doc(editingId).delete();

    // Clean up local state and UI
    delete points[editingId];
    if (markers[editingId]) { markers[editingId].setMap(null); delete markers[editingId]; }
    const li  = document.getElementById('li-' + editingId);
    if (li) li.remove();
    const opt = document.querySelector(`#filter-event-select option[value="${editingId}"]`);
    if (opt) opt.remove();

    if (activeId === editingId) {
      activeId = null;
      document.getElementById('event-card').classList.remove('visible');
      placeholder.style.display = '';
    }

    closeModal('add-modal');
    exitAddMode();
  } catch (err) {
    alert('שגיאה במחיקה: ' + err.message);
    btn.disabled    = false;
    btn.textContent = '🗑 מחק מיקום';
  }
});

// --- Save location (add or update) ---

document.getElementById('modal-save-btn').addEventListener('click', async () => {
  const name    = document.getElementById('f-name').value.trim();
  const loc     = document.getElementById('f-location').value.trim();
  const dateVal = document.getElementById('f-date').value;
  const timeVal = document.getElementById('f-time').value;

  // Validate required fields
  let valid = true;
  const setError = (id, show) => { document.getElementById(id).style.display = show ? '' : 'none'; };
  if (!name)                       { setError('err-name',     true);  valid = false; } else setError('err-name',     false);
  if (!loc)                        { setError('err-location', true);  valid = false; } else setError('err-location', false);
  if (!editingId && !dateVal)      { setError('err-date',     true);  valid = false; } else setError('err-date',     false);
  if (!timeVal)                    { setError('err-time',     true);  valid = false; } else setError('err-time',     false);
  if (!valid) return;

  // Format the date for display (keep existing date if editing and no new date chosen)
  let displayDate = editingId ? points[editingId].date : '';
  if (dateVal) {
    displayDate = new Date(dateVal + 'T00:00:00').toLocaleDateString('he-IL', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  const data = {
    name,
    lat:        pendingLatLng.lat,
    lng:        pendingLatLng.lng,
    location:   loc,
    date:       displayDate,
    time:       timeVal,
    directions: document.getElementById('f-directions').value.trim() || '—',
    capacity:   document.getElementById('f-capacity').value.trim()   || '—',
    notice:     document.getElementById('f-notice').value.trim()     || ''
  };

  const saveBtn = document.getElementById('modal-save-btn');
  saveBtn.disabled    = true;
  saveBtn.textContent = 'שומר...';

  try {
    if (editingId) {
      await db.collection('locations').doc(editingId).update(data);
    } else {
      const ref = await db.collection('locations').add(data);
      // Auto-select the new point after Firestore snapshot arrives
      setTimeout(() => selectPoint(ref.id), 300);
    }
    closeModal('add-modal');
    exitAddMode();
  } catch (err) {
    alert('שגיאה בשמירה. אנא נסו שוב.');
    console.error(err);
  } finally {
    saveBtn.disabled    = false;
    saveBtn.textContent = 'שמור מיקום';
  }
});
