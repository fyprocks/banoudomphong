/* =========================================================
   store.js: rooms, rates, bookings, availability and the
   owner login. Used by book.html, login.html, admin.html
   (and index/accommodation to show the current rate).

   IMPORTANT: everything is saved in the browser's
   localStorage, so data only exists on the device/browser
   where it was created. To share bookings between guests and
   the owner, swap load()/save() below for a real database
   (e.g. a Google Sheet via Apps Script). Nothing else changes.
   ========================================================= */

const STORE_KEY = 'bo_data_v1';

// ---------- Room types (edit names / photos / counts here) ----------
const ROOM_TYPES = [
  {
    id: 'single',
    name: 'Room 1 · Two Single Beds',
    beds: 'Two single beds',
    count: 2,                     // how many rooms of this type exist
    maxGuests: 4,
    defaultRate: 2000,
    photo: 'rooms/IMG_9733.JPG',
    features: ['Two single beds', 'Private bathroom with hot water', 'Air conditioning', 'Television', 'Free Wi-Fi']
  },
  {
    id: 'twin',
    name: 'Room 2 · Twin Beds',
    beds: 'Twin beds',
    count: 2,
    maxGuests: 4,
    defaultRate: 2500,
    photo: 'rooms/IMG_9735.JPG',
    features: ['Twin beds', 'Private bathroom with hot water', 'Air conditioning', 'Television', 'Free Wi-Fi']
  }
];
const MAX_GUESTS_PER_ROOM = 4;
const TOTAL_ROOMS = ROOM_TYPES.reduce((s, t) => s + t.count, 0);

// ---------- Owner login (defaults) ----------
const ADMIN_USER = 'francois';
const DEFAULT_PASSWORD = 'francois123';
const RECOVERY_KEY = 'renesas123';

// ---------- Low-level storage (swap these for a database later) ----------
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORE_KEY));
    if (d) { d.ratePeriods = d.ratePeriods || []; d.rates = d.rates || {}; d.log = d.log || []; d.bookings = d.bookings || []; return d; }
  } catch (e) {}
  return { rates: {}, ratePeriods: [], bookings: [], log: [], passwordHash: null };
}
function save(d) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) { alert('Could not save data in this browser.'); }
}

// ---------- Helpers ----------
const fmtTHB = n => 'THB ' + Math.round(n).toLocaleString('en-US');
const toISO = d => d.toISOString().slice(0, 10);
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return toISO(d); };
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return toISO(d); }
function nightsBetween(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 86400000); }
function fmtDate(iso) {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}
function makeRef() { return 'BO-' + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 5).toUpperCase(); }
function escapeHTML(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------- Activity log ----------
function addLog(d, action, detail) {
  d.log.unshift({ time: new Date().toISOString(), action, detail });
  d.log = d.log.slice(0, 1000);
}
function getLog() { return load().log; }

// =========================================================
// RATES: a standard rate per room type, plus date-range
// rates ("from date X to date Y, charge this").
// If date ranges overlap, the one added most recently wins.
// =========================================================
function getBaseRates() {
  const d = load();
  const r = {};
  ROOM_TYPES.forEach(t => r[t.id] = Number(d.rates[t.id]) || t.defaultRate);
  return r;
}
const getRates = getBaseRates;   // used by pages that show the standard rate
function setBaseRates(newRates) {
  const d = load();
  d.rates = { ...d.rates, ...newRates };
  addLog(d, 'Standard rates changed', ROOM_TYPES.map(t => `${t.beds}: ${fmtTHB(d.rates[t.id])}`).join(' · '));
  save(d);
}
function getRatePeriods() { return load().ratePeriods; }
function addRatePeriod(p) {
  const d = load();
  p.id = 'rp' + Date.now().toString(36);
  d.ratePeriods.push(p);
  addLog(d, 'Date-range rate added', `${p.label ? p.label + ' · ' : ''}${fmtDate(p.from)} → ${fmtDate(p.to)} · ` +
    ROOM_TYPES.map(t => `${t.beds}: ${fmtTHB(p[t.id])}`).join(' · '));
  save(d);
}
function deleteRatePeriod(id) {
  const d = load();
  const p = d.ratePeriods.find(x => x.id === id);
  d.ratePeriods = d.ratePeriods.filter(x => x.id !== id);
  if (p) addLog(d, 'Date-range rate removed', `${p.label ? p.label + ' · ' : ''}${fmtDate(p.from)} → ${fmtDate(p.to)}`);
  save(d);
}
// Rate for one room type on one night (night = check-in date of that night)
function rateForNight(typeId, night, base = getBaseRates(), periods = getRatePeriods()) {
  for (let i = periods.length - 1; i >= 0; i--) {
    const p = periods[i];
    if (p.from <= night && night <= p.to) return Number(p[typeId]);
  }
  return base[typeId];
}

// Price a stay night by night. Returns { lines:[{type, qty, nights, nightly:[{date,rate}], amount, avg}], total }
function priceStay(rooms, checkIn, checkOut) {
  const base = getBaseRates(), periods = getRatePeriods();
  const lines = ROOM_TYPES.filter(t => rooms[t.id] > 0).map(t => {
    const nightly = [];
    for (let n = checkIn; n < checkOut; n = addDays(n, 1)) nightly.push({ date: n, rate: rateForNight(t.id, n, base, periods) });
    const perRoom = nightly.reduce((s, x) => s + x.rate, 0);
    return { typeId: t.id, qty: rooms[t.id], nights: nightly.length, nightly, amount: perRoom * rooms[t.id], avg: perRoom / nightly.length };
  });
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}
// Lines for a saved booking (uses the prices it was booked at)
function bookingLines(b) {
  if (b.lines) return b.lines;
  // older bookings saved before date-range rates existed
  return ROOM_TYPES.filter(t => b.rooms[t.id] > 0).map(t => {
    const rate = (b.rates && b.rates[t.id]) || t.defaultRate;
    return { typeId: t.id, qty: b.rooms[t.id], nights: b.nights, nightly: [], amount: rate * b.nights * b.rooms[t.id], avg: rate };
  });
}
const typeById = id => ROOM_TYPES.find(t => t.id === id);

// =========================================================
// BOOKINGS
// status: 'pending'   = request from the website, waiting for the owner
//         'confirmed' = confirmed by the owner (or added by the owner)
//         'cancelled' = cancelled or declined
// Pending and confirmed bookings both hold the room.
// =========================================================
function getBookings() { return load().bookings; }
const holdsRoom = b => b.status === 'pending' || b.status === 'confirmed';

// Free rooms of each type for every night between checkIn and checkOut
function availability(checkIn, checkOut, bookings = getBookings()) {
  const active = bookings.filter(holdsRoom);
  const avail = {};
  ROOM_TYPES.forEach(t => {
    let maxUsed = 0;
    for (let night = checkIn; night < checkOut; night = addDays(night, 1)) {
      const used = active.filter(b => b.checkIn <= night && night < b.checkOut).reduce((s, b) => s + (b.rooms[t.id] || 0), 0);
      maxUsed = Math.max(maxUsed, used);
    }
    avail[t.id] = Math.max(0, t.count - maxUsed);
  });
  return avail;
}

// Returns {ok:true, booking} or {ok:false, error}
function createBooking(data, source = 'website') {
  const nights = nightsBetween(data.checkIn, data.checkOut);
  if (nights < 1) return { ok: false, error: 'Stay must be at least 1 night.' };
  const totalRooms = ROOM_TYPES.reduce((s, t) => s + (data.rooms[t.id] || 0), 0);
  if (totalRooms < 1) return { ok: false, error: 'Select at least one room.' };
  if (data.adults + data.children > totalRooms * MAX_GUESTS_PER_ROOM) return { ok: false, error: `Maximum ${MAX_GUESTS_PER_ROOM} guests per room, including children.` };
  const avail = availability(data.checkIn, data.checkOut);
  for (const t of ROOM_TYPES) {
    if ((data.rooms[t.id] || 0) > avail[t.id]) return { ok: false, error: `Only ${avail[t.id]} × ${t.beds} room(s) available for those dates.` };
  }
  const { lines, total } = priceStay(data.rooms, data.checkIn, data.checkOut);
  const booking = {
    ref: makeRef(), createdAt: new Date().toISOString(), source,
    status: source === 'admin' ? 'confirmed' : 'pending',
    checkIn: data.checkIn, checkOut: data.checkOut, nights,
    rooms: data.rooms, adults: data.adults, children: data.children,
    guest: data.guest, lines, total, cancellationFee: 0, cancelledAt: null
  };
  const d = load();
  d.bookings.unshift(booking);
  addLog(d, source === 'admin' ? 'Booking added by owner' : 'Booking request received (website)',
    `${booking.ref} · ${data.guest.first} ${data.guest.last} (${data.guest.country || '-'}) · ${data.guest.phone} · ` +
    `${fmtDate(booking.checkIn)} → ${fmtDate(booking.checkOut)} · ` +
    ROOM_TYPES.filter(t => data.rooms[t.id]).map(t => `${data.rooms[t.id]} × ${t.beds}`).join(', ') +
    ` · ${data.adults + data.children} guests · ${fmtTHB(total)}`);
  save(d);
  return { ok: true, booking };
}

function confirmBooking(ref) {
  const d = load();
  const b = d.bookings.find(x => x.ref === ref);
  if (!b || b.status !== 'pending') return;
  b.status = 'confirmed'; b.confirmedAt = new Date().toISOString();
  addLog(d, 'Booking confirmed', `${b.ref} · ${b.guest.first} ${b.guest.last}`);
  save(d);
}

// Cancellation policy: more than 24 h before check-in → 20 % fee; within 24 h → 100 %
const CHECKIN_HOUR = 14; // 2:00 PM
function cancellationFee(b, now = new Date()) {
  if (b.status === 'pending') return { pct: 0, fee: 0 };          // declining a request: no fee
  const checkInTime = new Date(b.checkIn + 'T00:00:00');
  checkInTime.setHours(CHECKIN_HOUR);
  const pct = (checkInTime - now) / 3600000 > 24 ? 0.2 : 1;
  return { pct, fee: Math.round(b.total * pct) };
}
function cancelBooking(ref) {
  const d = load();
  const b = d.bookings.find(x => x.ref === ref);
  if (!b || !holdsRoom(b)) return null;
  const wasPending = b.status === 'pending';
  const { pct, fee } = cancellationFee(b);
  b.status = 'cancelled'; b.cancelledAt = new Date().toISOString(); b.cancellationFee = fee;
  addLog(d, wasPending ? 'Booking request declined' : 'Booking cancelled',
    `${b.ref} · ${b.guest.first} ${b.guest.last}${wasPending ? '' : ` · fee ${pct * 100}% = ${fmtTHB(fee)}`}`);
  save(d);
  return b;
}
function deleteBooking(ref) {
  const d = load();
  const b = d.bookings.find(x => x.ref === ref);
  d.bookings = d.bookings.filter(x => x.ref !== ref);
  if (b) addLog(d, 'Booking deleted', `${b.ref} · ${b.guest.first} ${b.guest.last}`);
  save(d);
}

// ---------- Owner password ----------
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function checkPassword(pw) {
  const d = load();
  return (await sha256(pw)) === (d.passwordHash || await sha256(DEFAULT_PASSWORD));
}
async function setPassword(pw, how) {
  const d = load();
  d.passwordHash = await sha256(pw);
  addLog(d, 'Password changed', how);
  save(d);
}
function isLoggedIn() { try { return sessionStorage.getItem('bo_admin') === '1'; } catch (e) { return false; } }
function setLoggedIn(v) { try { v ? sessionStorage.setItem('bo_admin', '1') : sessionStorage.removeItem('bo_admin'); } catch (e) {} }