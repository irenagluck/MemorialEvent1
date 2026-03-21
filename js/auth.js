// =============================================
//  AUTHENTICATION
//
//  Handles Firebase Auth state changes, the
//  login modal (visitor + admin tabs), and logout.
//  Depends on: config.js, state.js
// =============================================

// =============================================
//  AUTH STATE LISTENER
// =============================================

auth.onAuthStateChanged(user => {
  currentAdmin = user;
  updateUIForAuth();
});

/**
 * Update all auth-dependent UI elements based on the
 * current login state (admin, known visitor, or anonymous).
 */
function updateUIForAuth() {
  const isAdmin        = !!currentAdmin;
  const isKnownVisitor = visitorInfo && !visitorInfo.isAnon;

  // Admin-only controls
  document.getElementById('add-location-btn').style.display  = isAdmin ? 'inline-block' : 'none';
  document.getElementById('admin-panel-btn').style.display   = isAdmin ? 'inline-block' : 'none';
  document.getElementById('edit-location-btn').style.display = isAdmin ? 'inline-block' : 'none';

  // Header: show user name or the login button
  if (isAdmin) {
    document.getElementById('user-display-name').textContent = 'מנהל: ' + currentAdmin.email;
    document.getElementById('user-status').style.display      = 'flex';
    document.getElementById('login-header-btn').style.display = 'none';
  } else if (isKnownVisitor) {
    document.getElementById('user-display-name').textContent = visitorInfo.name || 'מבקר רשום';
    document.getElementById('user-status').style.display      = 'flex';
    document.getElementById('login-header-btn').style.display = 'none';
  } else {
    document.getElementById('user-status').style.display      = 'none';
    document.getElementById('login-header-btn').style.display = 'inline-block';
  }
}

// =============================================
//  LOGOUT
// =============================================

document.getElementById('logout-btn').addEventListener('click', async () => {
  if (currentAdmin) await auth.signOut();
  visitorInfo = null;
  localStorage.removeItem('visitorInfo');
  updateUIForAuth();
});

// =============================================
//  LOGIN MODAL – OPEN & TABS
// =============================================

document.getElementById('login-header-btn').addEventListener('click', () => {
  // Always open on the visitor tab
  switchLoginTab('visitor');
  document.getElementById('admin-auth-error').style.display = 'none';

  // Pre-fill visitor fields if the user has logged in before
  if (visitorInfo) {
    document.getElementById('v-name').value  = visitorInfo.name  || '';
    document.getElementById('v-email').value = visitorInfo.email || '';
    document.getElementById('v-phone').value = visitorInfo.phone || '';
  }

  document.getElementById('login-modal').classList.add('visible');
});

document.getElementById('tab-visitor').addEventListener('click', () => switchLoginTab('visitor'));
document.getElementById('tab-admin').addEventListener('click',   () => switchLoginTab('admin'));

document.getElementById('login-modal-close').addEventListener('click', () => closeModal('login-modal'));
document.getElementById('login-modal').addEventListener('click', e => {
  if (e.target.id === 'login-modal') closeModal('login-modal');
});

/** Show either the 'visitor' or 'admin' tab inside the login modal. */
function switchLoginTab(tab) {
  const showVisitor = (tab === 'visitor');
  document.getElementById('visitor-tab').style.display = showVisitor ? '' : 'none';
  document.getElementById('admin-tab').style.display   = showVisitor ? 'none' : '';
  document.getElementById('tab-visitor').classList.toggle('active',  showVisitor);
  document.getElementById('tab-admin').classList.toggle('active',   !showVisitor);
}

// =============================================
//  LOGIN MODAL – VISITOR LOGIN
// =============================================

document.getElementById('visitor-enter-btn').addEventListener('click', () => {
  visitorInfo = {
    name:   document.getElementById('v-name').value.trim(),
    email:  document.getElementById('v-email').value.trim(),
    phone:  document.getElementById('v-phone').value.trim(),
    isAnon: false
  };
  localStorage.setItem('visitorInfo', JSON.stringify(visitorInfo));
  closeModal('login-modal');
  updateUIForAuth();
});

document.getElementById('visitor-anon-btn').addEventListener('click', () => {
  visitorInfo = { isAnon: true };
  localStorage.setItem('visitorInfo', JSON.stringify(visitorInfo));
  closeModal('login-modal');
  updateUIForAuth();
});

// =============================================
//  LOGIN MODAL – ADMIN LOGIN & REGISTER
// =============================================

document.getElementById('admin-login-btn').addEventListener('click', async () => {
  const email    = document.getElementById('a-email').value.trim();
  const password = document.getElementById('a-password').value;
  const errEl    = document.getElementById('admin-auth-error');

  errEl.style.display = 'none';
  if (!email || !password) {
    errEl.textContent   = 'יש להזין דוא"ל וסיסמא';
    errEl.style.display = '';
    return;
  }
  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeModal('login-modal');
  } catch (err) {
    errEl.textContent   = getAuthErrorHe(err.code);
    errEl.style.display = '';
  }
});

document.getElementById('admin-register-btn').addEventListener('click', async () => {
  const email    = document.getElementById('a-email').value.trim();
  const password = document.getElementById('a-password').value;
  const errEl    = document.getElementById('admin-auth-error');

  errEl.style.display = 'none';
  if (!email || !password) {
    errEl.textContent   = 'יש להזין דוא"ל וסיסמא';
    errEl.style.display = '';
    return;
  }
  if (password.length < 6) {
    errEl.textContent   = 'הסיסמא חייבת להכיל לפחות 6 תווים';
    errEl.style.display = '';
    return;
  }
  try {
    await auth.createUserWithEmailAndPassword(email, password);
    closeModal('login-modal');
  } catch (err) {
    errEl.textContent   = getAuthErrorHe(err.code);
    errEl.style.display = '';
  }
});
