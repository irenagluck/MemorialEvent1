// =============================================
//  EVENT REGISTRATION
//
//  Opens the registration modal for the
//  currently selected event, validates input,
//  checks for duplicates, and saves to Firestore.
//  Admin users also get a search-and-delete
//  section inside this modal.
//  Depends on: config.js, state.js, map.js
// =============================================

// =============================================
//  OPEN REGISTRATION MODAL
// =============================================

document.getElementById('register-btn').addEventListener('click', async () => {
  const p = points[activeId];
  if (!p) return;

  // Determine whether the event has already passed
  const eventDate = new Date(p.date);
  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const isPast    = eventDate < today;

  // Set up modal header
  document.getElementById('reg-event-title').textContent = `אירוע: ${p.name} – ${p.date}`;
  document.getElementById('reg-count').textContent       = '';

  // Show / hide elements based on past/future
  document.getElementById('reg-past-msg').style.display = isPast ? 'block' : 'none';
  document.getElementById('reg-save-btn').style.display = isPast ? 'none'  : 'inline-block';

  // Clear error and success states
  document.getElementById('reg-err-name').style.display    = 'none';
  document.getElementById('reg-err-contact').style.display = 'none';
  document.getElementById('reg-err-dup').style.display     = 'none';
  document.getElementById('reg-success').style.display     = 'none';

  // Pre-fill form with known visitor info
  const knownVisitor = visitorInfo && !visitorInfo.isAnon;
  document.getElementById('reg-name').value  = knownVisitor ? visitorInfo.name  || '' : '';
  document.getElementById('reg-phone').value = knownVisitor ? visitorInfo.phone || '' : '';
  document.getElementById('reg-email').value = knownVisitor ? visitorInfo.email || '' : '';

  // Show admin search section only for admins
  const adminSec = document.getElementById('reg-admin-section');
  adminSec.style.display = currentAdmin ? 'block' : 'none';
  if (currentAdmin) {
    document.getElementById('reg-admin-search').value    = '';
    document.getElementById('reg-admin-results').innerHTML = '';
  }

  document.getElementById('register-modal').classList.add('visible');

  // Load registration count in the background (non-critical)
  try {
    const snap = await db.collection('registrations').where('locationId', '==', activeId).get();
    document.getElementById('reg-count').textContent = `כבר נרשמו: ${snap.size} משתתפים לאירוע זה`;
  } catch (e) { /* non-critical — ignore */ }
});

// =============================================
//  CLOSE MODAL
// =============================================

document.getElementById('reg-modal-close').addEventListener('click', () => closeModal('register-modal'));
document.getElementById('reg-cancel-btn').addEventListener('click',  () => closeModal('register-modal'));
document.getElementById('register-modal').addEventListener('click',  e => {
  if (e.target.id === 'register-modal') closeModal('register-modal');
});

// Clear the duplicate-error message whenever the user types
['reg-name', 'reg-phone', 'reg-email'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    const el = document.getElementById('reg-err-dup');
    el.textContent   = '';
    el.style.display = 'none';
  });
});

// =============================================
//  SUBMIT REGISTRATION
// =============================================

document.getElementById('reg-save-btn').addEventListener('click', async () => {
  const name  = document.getElementById('reg-name').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const email = document.getElementById('reg-email').value.trim();

  // Validate
  let valid = true;
  if (!name) {
    document.getElementById('reg-err-name').style.display = '';
    valid = false;
  } else {
    document.getElementById('reg-err-name').style.display = 'none';
  }
  if (!phone && !email) {
    document.getElementById('reg-err-contact').style.display = '';
    valid = false;
  } else {
    document.getElementById('reg-err-contact').style.display = 'none';
  }
  if (!valid) return;

  const p   = points[activeId];
  const btn = document.getElementById('reg-save-btn');
  btn.disabled    = true;
  btn.textContent = 'בודק...';

  // Duplicate check: fetch all registrations for this event and filter client-side.
  // (Avoids the need for a composite Firestore index on name + phone/email.)
  try {
    const dupSnap = await db.collection('registrations').where('locationId', '==', activeId).get();
    const dupDoc  = dupSnap.docs.find(doc => {
      const d          = doc.data();
      const sameName   = (d.name || '').trim().toLowerCase() === name.toLowerCase();
      const sameContact = (phone && d.phone === phone) || (email && d.email === email);
      return sameName && sameContact;
    });
    if (dupDoc) {
      const errEl         = document.getElementById('reg-err-dup');
      errEl.textContent   = `${name} כבר רשום/ה לאירוע זה.`;
      errEl.style.display = 'block';
      btn.disabled        = false;
      btn.textContent     = 'הרשמה';
      return;
    }
  } catch (e) {
    btn.disabled    = false;
    btn.textContent = 'הרשמה';
    alert('שגיאה בבדיקת כפילויות: ' + e.message);
    return;
  }

  // Save registration
  btn.textContent = 'שומר...';
  try {
    await db.collection('registrations').add({
      locationId:   activeId,
      locationName: p.name,
      name, phone, email,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Remember visitor info for future registrations
    if (!visitorInfo || visitorInfo.isAnon) {
      visitorInfo = { name, phone, email, isAnon: false };
      localStorage.setItem('visitorInfo', JSON.stringify(visitorInfo));
      updateUIForAuth();
    }

    document.getElementById('reg-success').style.display  = '';
    document.getElementById('reg-save-btn').style.display = 'none';
  } catch (err) {
    alert('שגיאה בשמירה. אנא נסו שוב.');
    console.error(err);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'הרשמה';
  }
});

// =============================================
//  ADMIN: SEARCH & DELETE REGISTRATIONS
//  (inside the registration modal)
// =============================================

document.getElementById('reg-admin-search-btn').addEventListener('click', async () => {
  const query   = document.getElementById('reg-admin-search').value.trim();
  const results = document.getElementById('reg-admin-results');

  if (!query) { results.innerHTML = ''; return; }
  results.innerHTML = '<p style="font-size:0.82rem;color:#888">מחפש...</p>';

  try {
    const snap    = await db.collection('registrations').where('locationId', '==', activeId).get();
    const matches = snap.docs.filter(d => (d.data().name || '').includes(query));

    if (matches.length === 0) {
      results.innerHTML = '<p style="font-size:0.82rem;color:#888">לא נמצאו תוצאות.</p>';
      return;
    }

    results.innerHTML = matches.map(doc => {
      const d = doc.data();
      const safeName = (d.name || '').replace(/"/g, '&quot;');
      return `
        <div id="radm-${doc.id}" style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid #eee;font-size:0.82rem">
          <span>${d.name || '—'} | ${d.phone || '—'} | ${d.email || '—'}</span>
          <button data-id="${doc.id}" data-name="${safeName}"
            style="background:#c00;color:white;border:none;border-radius:4px;padding:2px 9px;cursor:pointer;font-size:0.78rem;white-space:nowrap">
            🗑 מחק
          </button>
        </div>`;
    }).join('');

    results.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('למחוק הרשמה של ' + btn.dataset.name + '?')) return;
        btn.disabled = true;
        try {
          await db.collection('registrations').doc(btn.dataset.id).delete();
          document.getElementById('radm-' + btn.dataset.id).remove();
          // Refresh the count
          const snap2 = await db.collection('registrations').where('locationId', '==', activeId).get();
          document.getElementById('reg-count').textContent = `כבר נרשמו: ${snap2.size} משתתפים לאירוע זה`;
        } catch (e) {
          alert('שגיאה: ' + e.message);
          btn.disabled = false;
        }
      });
    });
  } catch (e) {
    results.innerHTML = `<p style="color:#c00;font-size:0.82rem">שגיאה: ${e.message}</p>`;
  }
});
