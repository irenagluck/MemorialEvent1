# Memorial Event Website – Project Summary

## What This Is
A public-facing web application for the **Jewish Democratic Initiative (היוזמה הדמוקרטית היהודית)**
to manage and display Yom Hazikaron (Memorial Day) events across Israel.

---

## Live Website & Code

| Item | Details |
|---|---|
| **Hosting** | Netlify (drag-and-drop deployment) |
| **GitHub repository** | https://github.com/irenagluck/MemorialEvent1 |
| **Local files** | `C:\Projects\MemorialEvent1\` |
| **How to redeploy** | Go to https://app.netlify.com → your site → drag the entire project folder |

> After redeploying to Netlify, add the new Netlify URL to **Firebase Console → Authentication → Settings → Authorized Domains**.

---

## Technology Stack

| Component | Technology | Notes |
|---|---|---|
| Website structure | HTML + CSS + plain JavaScript | No build step, no installation needed |
| Map | Google Maps JavaScript API | Requires API key (see below) |
| Geocoding | Google Geocoding API | Used for city name search |
| Address autocomplete | Google Places API | Used in the add/edit location form |
| Database | Google Firebase Firestore | Real-time sync, free tier |
| Authentication | Google Firebase Auth | Email/password for admins only |
| Hosting | Netlify | Free tier, drag-and-drop |
| Source control | Git + GitHub | https://github.com/irenagluck/MemorialEvent1 |

---

## File Structure

```
index.html          — HTML structure only (no inline CSS or JS)
css/
  styles.css        — All application styles
js/
  config.js         — Firebase config & initialization
  state.js          — Shared state variables + utility functions
  map.js            — Google Maps init, markers, event card population
  auth.js           — Firebase auth listener, login modal, logout
  locations.js      — Firestore listener, add/edit/delete location modal
                      + Google Places Autocomplete on address field
  search.js         — Search bar, autocomplete, Google geocoding, GPS
  registration.js   — Event registration modal + admin search within it
  admin.js          — Admin panel: registrations table + broadcast templates
```

**Script load order matters** (each file depends on globals from the ones before it):
`config → state → map → auth → locations → search → registration → admin`

---

## Google Maps Configuration

- **API Key:** `AIzaSyAfNIbaViqyfDQz0DsoDlJh_oLuE72bpd0`
- **Google Cloud Console:** https://console.cloud.google.com
- **APIs that must be enabled:** Maps JavaScript API, Geocoding API, Places API
- **Key restriction:** Restrict to your Netlify domain after deploying (recommended)

---

## Firebase Configuration

- **Firebase Console:** https://console.firebase.google.com
- **Project name / ID:** `memorialevent`

### Config keys (embedded in `js/config.js`)
```
apiKey:            AIzaSyCGRbzgxdKA2fiG8BJaYWIOdvOlALoKOqs
authDomain:        memorialevent.firebaseapp.com
projectId:         memorialevent
storageBucket:     memorialevent.firebasestorage.app
messagingSenderId: 132399885238
appId:             1:132399885238:web:ac6671f39417d093ceef17
```

### Firestore Collections

**`locations`** — one document per event:
```
name        – Settlement name (e.g. "רעננה")
lat / lng   – Map coordinates (set by clicking map or choosing address via autocomplete)
location    – Venue name/address
date        – Event date (YYYY-MM-DD)
time        – Event time (e.g. "20:00")
directions  – How to get there
capacity    – Max attendees
notice      – Extra message for attendees
```

**`registrations`** — one document per registration:
```
locationId  – ID of the event the visitor registered for
name        – Visitor full name
phone       – Phone number
email       – Email address
timestamp   – When they registered
```

**`config / messages`** — broadcast templates (single document):
```
templates   – Array of { id, name, date, text } objects
```

---

## Features Built

| Feature | Description |
|---|---|
| Interactive map | Google Map of Israel with colored dots for each event |
| Search bar | Find events by settlement name or event name |
| GPS "Near Me" | Finds the closest event to the visitor's location |
| Event detail card | Click a dot to see full event info in the side panel |
| Navigate button | One-click Google Maps navigation to the event venue |
| Visitor login | Visitors enter optional name/phone/email (saved in browser) |
| Event registration | Visitors register for an event; stored in Firestore |
| Admin login | Email/password authentication via Firebase Auth |
| Add location (admin) | Click map or type address → Places Autocomplete → save to Firestore |
| Edit / delete location (admin) | Full edit form with address autocomplete and marker preview |
| Address autocomplete | Google Places Autocomplete on the address field (Israel only) |
| Marker preview | Map marker moves live when admin selects an address from autocomplete |
| Admin panel | View all registrations, filter by event, delete entries |
| Broadcast messages | Admin composes messages that appear on all event cards |
| Real-time sync | All changes appear instantly for all users via Firestore |
| Hebrew / RTL | Full right-to-left layout, `lang="he"` |
| Mobile friendly | Responsive layout for phone and tablet |

---

## How to Update the Website

### Making code changes:
1. Open the project folder in VS Code: `C:\Projects\MemorialEvent1\`
2. Edit the relevant file(s) with Claude's help
3. Ask Claude to "save to Git and push" — this commits and uploads to GitHub
4. Redeploy to Netlify (drag the folder, or connect Netlify to GitHub for automatic deploys)

### Managing event data directly:
- Firebase Console → Firestore Database → `locations` collection
- You can add, edit, or delete documents directly there

---

## External Libraries (loaded from CDN, no download needed)

- **Google Maps JS API** (incl. Places) — `maps.googleapis.com`
- **Firebase App 10.12.2** — `gstatic.com/firebasejs`
- **Firebase Auth 10.12.2** — `gstatic.com/firebasejs`
- **Firebase Firestore 10.12.2** — `gstatic.com/firebasejs`

---

## Important Notes

- **Firestore security rules** are currently open (allow all reads and writes). This is acceptable because all writes go through admin login in the UI, but for extra security the rules should be tightened before the event goes live.
- **Google Maps billing:** The account has a $200/month free credit — normal usage for this app will not incur charges.
- **Visitor info** (name, phone, email) is stored in the visitor's browser `localStorage` and pre-fills the registration form on return visits.
- All location and registration data entered is stored permanently in Firestore until manually deleted.
