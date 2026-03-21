// =============================================
//  ADMIN PANEL
//
//  Two tabs:
//    1. Registrations — browse and delete
//       registrations across all events.
//    2. Broadcast — compose a message and
//       append it to every event's notice field.
//       Messages are saved as reusable templates.
//  Depends on: config.js, state.js
// =============================================

// =============================================
//  OPEN / CLOSE ADMIN PANEL
// =============================================

document.getElementById('admin-panel-btn').addEventListener('click', () => {
  showAdminTab('registrations');
  document.getElementById('admin-panel-modal').classList.add('visible');
});
document.getElementById('admin-panel-close').addEventListener('click', () => closeModal('admin-panel-modal'));
document.getElementById('admin-panel-modal').addEventListener('click', e => {
  if (e.target.id === 'admin-panel-modal') closeModal('admin-panel-modal');
});

document.getElementById('ap-tab-reg').addEventListener('click',       () => showAdminTab('registrations'));
document.getElementById('ap-tab-broadcast').addEventListener('click', () => showAdminTab('broadcast'));

/** Switch the admin panel to the 'registrations' or 'broadcast' tab. */
function showAdminTab(tab) {
  document.getElementById('ap-registrations').style.display = tab === 'registrations' ? 'block' : 'none';
  document.getElementById('ap-broadcast').style.display     = tab === 'broadcast'      ? 'block' : 'none';
  document.getElementById('ap-tab-reg').classList.toggle('active',       tab === 'registrations');
  document.getElementById('ap-tab-broadcast').classList.toggle('active', tab === 'broadcast');
  if (tab === 'broadcast') { resetBroadcastForm(); loadBroadcastTemplates(); }
}

// =============================================
//  TAB 1: REGISTRATIONS TABLE
// =============================================

document.getElementById('load-registrations-btn').addEventListener('click', async () => {
  const filterEvent = document.getElementById('filter-event-select').value;
  const container   = document.getElementById('reg-table-container');
  container.innerHTML = '<p style="color:#888;font-size:0.88rem">טוען...</p>';

  try {
    let query = db.collection('registrations');
    if (filterEvent) query = query.where('locationId', '==', filterEvent);
    const snap = await query.get();

    const docs = snap.docs.sort((a, b) => {
      const ta = a.data().timestamp, tb = b.data().timestamp;
      return (tb && ta) ? tb.seconds - ta.seconds : 0;
    });

    if (docs.length === 0) {
      container.innerHTML = '<p style="color:#888;font-size:0.88rem">אין רשומים עדיין.</p>';
      return;
    }

    let html = `<p class="reg-count">סה"כ: ${docs.length} רשומים</p>`;
    html += '<table class="reg-table"><thead><tr><th>שם</th><th>טלפון</th><th>דוא"ל</th><th>אירוע</th><th>תאריך הרשמה</th><th></th></tr></thead><tbody>';
    docs.forEach(doc => {
      const d        = doc.data();
      const ts       = d.timestamp ? d.timestamp.toDate().toLocaleDateString('he-IL') : '—';
      const safeName = (d.name || '—').replace(/'/g, "\\'");
      html += `
        <tr id="reg-row-${doc.id}">
          <td>${d.name || '—'}</td>
          <td>${d.phone || '—'}</td>
          <td>${d.email || '—'}</td>
          <td>${d.locationName || '—'}</td>
          <td>${ts}</td>
          <td>
            <button class="reg-del-btn" data-id="${doc.id}" data-name="${safeName}"
              style="background:#c00;color:white;border:none;border-radius:4px;padding:3px 9px;cursor:pointer;font-size:0.78rem;white-space:nowrap">
              🗑 מחק
            </button>
          </td>
        </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    container.querySelectorAll('.reg-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('למחוק הרשמה של ' + btn.dataset.name + '?')) return;
        btn.disabled    = true;
        btn.textContent = '...';
        try {
          await db.collection('registrations').doc(btn.dataset.id).delete();
          document.getElementById('reg-row-' + btn.dataset.id).remove();
        } catch (err) {
          alert('שגיאה במחיקה: ' + err.message);
          btn.disabled    = false;
          btn.textContent = '🗑 מחק';
        }
      });
    });
  } catch (err) {
    container.innerHTML = `<p style="color:#c00">שגיאה: ${err.code}</p>`;
  }
});

// =============================================
//  TAB 2: BROADCAST TEMPLATES
// =============================================

/** Load broadcast templates from Firestore config document. */
async function loadBroadcastTemplates() {
  try {
    const doc = await db.collection('config').doc('messages').get();
    broadcastTemplates = doc.exists ? (doc.data().templates || []) : [];
  } catch (e) {
    broadcastTemplates = [];
  }
  renderTemplateList();
}

/** Persist the current in-memory templates array to Firestore. */
async function saveBroadcastTemplates() {
  await db.collection('config').doc('messages').set({ templates: broadcastTemplates });
}

/** Render the list of saved broadcast message templates. */
function renderTemplateList() {
  const container = document.getElementById('bc-template-list');
  if (broadcastTemplates.length === 0) {
    container.innerHTML = '<p style="color:#888;font-size:0.85rem">אין הודעות שמורות עדיין.</p>';
    return;
  }

  // Show newest first
  const sorted = [...broadcastTemplates].sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  );

  container.innerHTML = sorted.map(t => {
    const isSelected = t.id === selectedTemplateId;
    return `
      <div class="bc-tmpl-row" data-id="${t.id}"
        style="display:flex;align-items:center;gap:8px;padding:9px 12px;background:${isSelected ? '#e8eeff' : 'white'};border:1px solid ${isSelected ? '#0055cc' : '#dde3f0'};border-radius:7px;margin-bottom:6px;cursor:pointer;transition:background 0.15s">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:0.9rem;color:#003399">${t.name}</div>
          <div style="font-size:0.78rem;color:#666;margin-top:2px">${t.date || ''}</div>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.bc-tmpl-row').forEach(row => {
    row.addEventListener('click', () => {
      const tmpl = broadcastTemplates.find(t => t.id === row.dataset.id);
      if (!tmpl) return;
      selectedTemplateId = tmpl.id;
      document.getElementById('bc-name-input').value  = tmpl.name;
      document.getElementById('bc-date-input').value  = tmpl.date || '';
      document.getElementById('broadcast-text').value = tmpl.text;
      document.getElementById('bc-form-title').textContent         = '✏ עריכת הודעה';
      document.getElementById('bc-delete-template-btn').style.display = 'inline-block';
      renderTemplateList();
    });
  });
}

/** Reset the broadcast form to a blank "new message" state. */
function resetBroadcastForm() {
  selectedTemplateId = null;
  document.getElementById('bc-name-input').value  = '';
  document.getElementById('broadcast-text').value = '';
  document.getElementById('bc-name-suggestions').style.display       = 'none';
  document.getElementById('bc-delete-template-btn').style.display    = 'none';
  document.getElementById('bc-form-title').textContent               = '✉ הודעה חדשה';
  document.getElementById('bc-date-input').value = new Date().toISOString().slice(0, 10);
}

// =============================================
//  BROADCAST NAME FIELD AUTOCOMPLETE
// =============================================

document.getElementById('bc-name-input').addEventListener('input', function () {
  const val  = this.value.trim();
  const sugg = document.getElementById('bc-name-suggestions');

  // If the user edits the name away from the loaded template, deselect it
  if (selectedTemplateId && broadcastTemplates.find(t => t.id === selectedTemplateId)?.name !== val) {
    selectedTemplateId = null;
    document.getElementById('bc-delete-template-btn').style.display = 'none';
    document.getElementById('bc-form-title').textContent            = '✉ הודעה חדשה';
  }

  if (!val) { sugg.style.display = 'none'; return; }

  const matches = broadcastTemplates.filter(t => t.name.includes(val));
  if (matches.length === 0) { sugg.style.display = 'none'; return; }

  sugg.innerHTML = matches.map(t => `
    <div class="bc-name-sugg" data-id="${t.id}"
      style="padding:9px 14px;cursor:pointer;font-size:0.9rem;border-bottom:1px solid #eee">
      <span style="font-weight:700">${t.name}</span>
      ${t.date ? `<span style="font-size:0.78rem;color:#888;margin-right:8px">${t.date}</span>` : ''}
    </div>`
  ).join('');
  sugg.style.display = 'block';

  sugg.querySelectorAll('.bc-name-sugg').forEach(el => {
    el.addEventListener('click', () => {
      const tmpl = broadcastTemplates.find(t => t.id === el.dataset.id);
      if (tmpl) {
        selectedTemplateId = tmpl.id;
        document.getElementById('bc-name-input').value  = tmpl.name;
        document.getElementById('bc-date-input').value  = tmpl.date || '';
        document.getElementById('broadcast-text').value = tmpl.text;
        document.getElementById('bc-form-title').textContent         = '✏ עריכת הודעה';
        document.getElementById('bc-delete-template-btn').style.display = 'inline-block';
        renderTemplateList();
      }
      sugg.style.display = 'none';
    });
  });
});

// Close the name suggestions when clicking elsewhere
document.addEventListener('click', e => {
  if (!e.target.closest('#ap-broadcast'))
    document.getElementById('bc-name-suggestions').style.display = 'none';
});

// =============================================
//  DELETE BROADCAST TEMPLATE
// =============================================

document.getElementById('bc-delete-template-btn').addEventListener('click', async () => {
  if (!selectedTemplateId) return;
  const tmpl = broadcastTemplates.find(t => t.id === selectedTemplateId);
  if (!tmpl) return;
  if (!confirm(`למחוק הודעה "${tmpl.name}" ולהסיר אותה מכל הנקודות?`)) return;

  const msg = tmpl.text;
  try {
    // Remove the message text from every location's notice field
    const batch = db.batch();
    Object.keys(points).forEach(id => {
      let notice      = points[id].notice || '';
      const bcast     = points[id].broadcastMessage || '';
      if (notice.includes(msg)) {
        notice = notice.replace('\n\n' + msg, '').replace(msg + '\n\n', '').replace(msg, '').trim();
        batch.update(db.collection('locations').doc(id), {
          notice,
          broadcastMessage: bcast === msg ? '' : bcast
        });
      }
    });
    await batch.commit();

    broadcastTemplates = broadcastTemplates.filter(t => t.id !== selectedTemplateId);
    await saveBroadcastTemplates();
    resetBroadcastForm();
    renderTemplateList();
  } catch (e) {
    alert('שגיאה במחיקה: ' + e.message);
  }
});

// =============================================
//  SEND BROADCAST TO ALL LOCATIONS
// =============================================

document.getElementById('broadcast-send-btn').addEventListener('click', async () => {
  const name = document.getElementById('bc-name-input').value.trim();
  const date = document.getElementById('bc-date-input').value;
  const msg  = document.getElementById('broadcast-text').value.trim();

  if (!name) { alert('יש להזין שם קצר להודעה.'); return; }
  if (!msg)  { alert('יש להזין תוכן להודעה.'); return; }

  const btn      = document.getElementById('broadcast-send-btn');
  const statusEl = document.getElementById('broadcast-status');
  btn.disabled    = true;
  btn.textContent = 'שולח...';
  statusEl.style.display = 'none';

  try {
    // Save or update the template
    const existingIdx = selectedTemplateId
      ? broadcastTemplates.findIndex(t => t.id === selectedTemplateId)
      : -1;

    if (existingIdx >= 0) {
      broadcastTemplates[existingIdx].name = name;
      broadcastTemplates[existingIdx].date = date;
      broadcastTemplates[existingIdx].text = msg;
    } else {
      const newId = generateId();
      broadcastTemplates.push({ id: newId, name, date, text: msg });
      selectedTemplateId = newId;
    }
    await saveBroadcastTemplates();

    // Append the message to every location's notice field
    const batch = db.batch();
    Object.keys(points).forEach(id => {
      const existing  = points[id].notice || '';
      const newNotice = existing ? existing + '\n\n' + msg : msg;
      batch.update(db.collection('locations').doc(id), { notice: newNotice, broadcastMessage: msg });
    });
    await batch.commit();

    document.getElementById('bc-form-title').textContent         = '✏ עריכת הודעה';
    document.getElementById('bc-delete-template-btn').style.display = 'inline-block';
    renderTemplateList();

    statusEl.textContent   = `✓ נשלח ל-${Object.keys(points).length} נקודות ונשמר!`;
    statusEl.style.display = 'inline';
    setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
  } catch (err) {
    alert('שגיאה בשליחה: ' + err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'שלח לכולם';
  }
});
