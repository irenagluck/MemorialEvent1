// =============================================
//  SHARED APPLICATION STATE
//
//  Declares all variables that are read or
//  written by more than one JS module.
//  Loaded second, after config.js.
// =============================================

// --- Auth ---
let currentAdmin = null;
let visitorInfo  = JSON.parse(localStorage.getItem('visitorInfo') || 'null');

// --- Map data ---
// points  : { [firestoreDocId]: pointObject }
// markers : { [firestoreDocId]: L.Marker }
const points  = {};
const markers = {};
let   activeId = null;   // Firestore ID of the currently selected point

// --- Add / edit location (admin) ---
let addMode       = false;
let pendingLatLng = null; // { lat, lng } chosen on map click
let editingId     = null; // Firestore ID of the point being edited

// --- Broadcast templates (admin) ---
let broadcastTemplates = [];
let selectedTemplateId = null;

// =============================================
//  SHARED UTILITY FUNCTIONS
// =============================================

/** Hide a modal overlay by removing the 'visible' class. */
function closeModal(id) {
  document.getElementById(id).classList.remove('visible');
}

/** Translate a Firebase auth error code to Hebrew. */
function getAuthErrorHe(code) {
  const messages = {
    'auth/user-not-found':       'משתמש לא נמצא',
    'auth/wrong-password':       'סיסמא שגויה',
    'auth/invalid-email':        'כתובת דוא"ל לא תקינה',
    'auth/email-already-in-use': 'כתובת דוא"ל כבר רשומה',
    'auth/weak-password':        'הסיסמא חלשה מדי',
    'auth/invalid-credential':   'פרטי ההתחברות שגויים'
  };
  return messages[code] || 'שגיאה: ' + code;
}

/** Generate a short random ID (used for broadcast template IDs). */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// =============================================
//  PASSWORD VISIBILITY TOGGLE
// =============================================
document.querySelectorAll('.show-pw-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const input = document.getElementById(btn.dataset.target);
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁';
    }
  });
});
