/* Owner admin dashboard */
const $ = id => document.getElementById(id);
const roomsText = r => ROOM_TYPES.filter(t => r[t.id]).map(t => `${r[t.id]} × ${t.beds}`).join(', ');
const shortDate = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' });
const dateTime = iso => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const STATUS_LABEL = { pending: 'Request', confirmed: 'Confirmed', cancelled: 'Cancelled' };
const CAL_END = '2027-12';   // calendar goes up to this month

// ---------- Tabs ----------
document.querySelectorAll('#adminTabs button').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('#adminTabs button').forEach(b => b.classList.toggle('active', b === btn));
  document.querySelectorAll('.tab-panel').forEach(p => p.hidden = p.id !== 'tab-' + btn.dataset.tab);
  renderAll();
}));
$('logout').onclick = () => { setLoggedIn(false); location.href = 'login.html'; };

// =========================================================
// SUMMARY
// =========================================================
function renderSummary() {
  const all = getBookings();
  const today = todayISO();
  const pending = all.filter(b => b.status === 'pending');
  const confirmed = all.filter(b => b.status === 'confirmed');
  const cancelled = all.filter(b => b.status === 'cancelled');
  const revenue = confirmed.reduce((s, b) => s + b.total, 0) + cancelled.reduce((s, b) => s + (b.cancellationFee || 0), 0);
  const tonightFree = Object.values(availability(today, addDays(today, 1))).reduce((a, b) => a + b, 0);

  $('kpis').innerHTML = [
    ['Total Bookings', all.length],
    ['Requests to Confirm', pending.length],
    ['Upcoming Confirmed', confirmed.filter(b => b.checkOut > today).length],
    ['Cancelled', cancelled.length],
    ['Revenue (confirmed + fees)', fmtTHB(revenue)],
    ['Rooms Booked Tonight', `${TOTAL_ROOMS - tonightFree} / ${TOTAL_ROOMS}`]
  ].map(([k, v]) => `<div class="kpi"><span>${k}</span><strong>${v}</strong></div>`).join('');

  renderCalendars();

  $('pendingList').innerHTML = pending.length
    ? pending.map(b => `<div class="list-row"><strong>${shortDate(b.checkIn)} → ${shortDate(b.checkOut)}</strong> ${escapeHTML(b.guest.first + ' ' + b.guest.last)} · ${roomsText(b.rooms)} · ${fmtTHB(b.total)}
        <span class="row-actions"><button class="mini ok" data-confirm="${b.ref}">Confirm</button><button class="mini" data-cancel="${b.ref}">Decline</button><a href="#" data-view="${b.ref}">View</a></span></div>`).join('')
    : '<p class="muted">No requests waiting.</p>';

  const week = addDays(today, 7);
  const arr = all.filter(b => holdsRoom(b) && b.checkIn >= today && b.checkIn < week).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  $('arrivals').innerHTML = arr.length
    ? arr.map(b => `<div class="list-row"><strong>${shortDate(b.checkIn)}</strong> ${escapeHTML(b.guest.first + ' ' + b.guest.last)} · ${roomsText(b.rooms)} · ${b.nights} night${b.nights > 1 ? 's' : ''} <span class="status ${b.status}">${STATUS_LABEL[b.status]}</span> <a href="#" data-view="${b.ref}">View</a></div>`).join('')
    : '<p class="muted">No arrivals in the next 7 days.</p>';

  const byCountry = {};
  all.forEach(b => { const c = (b.guest.country || '').trim() || 'Unknown'; byCountry[c] = (byCountry[c] || 0) + 1; });
  const rows = Object.entries(byCountry).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map(r => r[1]));
  $('countries').innerHTML = rows.length
    ? rows.map(([c, n]) => `<div class="bar-row"><span>${escapeHTML(c)}</span><div class="bar"><i style="width:${n / max * 100}%"></i></div><b>${n}</b></div>`).join('')
    : '<p class="muted">No bookings yet.</p>';
}

// =========================================================
// MONTHLY CALENDARS: one per room type, green / yellow / red
// =========================================================
const monthKey = d => d.slice(0, 7);                        // '2026-11'
const months = [];
for (let m = monthKey(todayISO()); m <= CAL_END; ) {
  months.push(m);
  const [y, mo] = m.split('-').map(Number);
  m = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
}
let calIndex = 0;
$('calMonth').innerHTML = months.map((m, i) =>
  `<option value="${i}">${new Date(m + '-01T00:00:00Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</option>`).join('');
$('calMonth').onchange = () => { calIndex = Number($('calMonth').value); renderCalendars(); };
$('calPrev').onclick = () => { if (calIndex > 0) { calIndex--; renderCalendars(); } };
$('calNext').onclick = () => { if (calIndex < months.length - 1) { calIndex++; renderCalendars(); } };

function renderCalendars() {
  const m = months[calIndex];
  $('calMonth').value = calIndex;
  $('calPrev').disabled = calIndex === 0;
  $('calNext').disabled = calIndex === months.length - 1;
  const first = m + '-01';
  const [y, mo] = m.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const startDow = (new Date(first + 'T00:00:00Z').getUTCDay() + 6) % 7;   // Monday = 0
  const today = todayISO();
  const bookings = getBookings();

  $('calendars').innerHTML = ROOM_TYPES.map(t => {
    let cells = '';
    for (let i = 0; i < startDow; i++) cells += '<div class="cal-day empty"></div>';
    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${m}-${String(day).padStart(2, '0')}`;
      const free = availability(date, addDays(date, 1), bookings)[t.id];
      const cls = date < today ? 'past' : free === 0 ? 'full' : free < t.count ? 'part' : 'free';
      cells += `<button class="cal-day ${cls}" data-day="${date}" title="${free} of ${t.count} free">
                  <span class="d">${day}</span><span class="f">${free}/${t.count}</span></button>`;
    }
    return `<div class="cal">
      <h4>${escapeHTML(t.name)}</h4>
      <div class="cal-week">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => `<span>${d}</span>`).join('')}</div>
      <div class="cal-days">${cells}</div>
    </div>`;
  }).join('');
}

// Click a day → list the bookings staying that night
document.addEventListener('click', e => {
  const cell = e.target.closest('.cal-day[data-day]');
  if (!cell) return;
  const day = cell.dataset.day;
  const staying = getBookings().filter(b => holdsRoom(b) && b.checkIn <= day && day < b.checkOut);
  $('dayDetail').innerHTML = `<div class="day-detail"><strong>${fmtDate(day)}</strong> · ` +
    ROOM_TYPES.map(t => `${t.beds}: ${fmtTHB(rateForNight(t.id, day))}`).join(' · ') +
    (staying.length
      ? staying.map(b => `<div class="list-row">${escapeHTML(b.guest.first + ' ' + b.guest.last)} · ${roomsText(b.rooms)} · ${shortDate(b.checkIn)} → ${shortDate(b.checkOut)} <span class="status ${b.status}">${STATUS_LABEL[b.status]}</span> <a href="#" data-view="${b.ref}">View</a></div>`).join('')
      : '<p class="muted" style="margin-top:8px">No guests staying this night.</p>') + '</div>';
});

// =========================================================
// BOOKINGS TABLE
// =========================================================
function renderBookings() {
  const term = $('fSearch').value.trim().toLowerCase();
  const status = $('fStatus').value;
  const list = getBookings().filter(b => {
    if (status && b.status !== status) return false;
    if (!term) return true;
    const g = b.guest;
    return [b.ref, g.first, g.last, g.phone, g.email, g.country].join(' ').toLowerCase().includes(term);
  });
  $('bookingsTable').innerHTML =
    `<tr><th>Ref</th><th>Received</th><th>Guest</th><th>Country</th><th>Stay</th><th>Rooms</th><th>Guests</th><th>Total</th><th>Source</th><th>Status</th><th></th></tr>` +
    (list.length ? list.map(b => `
      <tr class="${b.status}">
        <td><a href="#" data-view="${b.ref}">${b.ref}</a></td>
        <td>${dateTime(b.createdAt)}</td>
        <td>${escapeHTML(b.guest.first + ' ' + b.guest.last)}<small>${escapeHTML(b.guest.phone)}</small></td>
        <td>${escapeHTML(b.guest.country || '-')}</td>
        <td>${shortDate(b.checkIn)} → ${shortDate(b.checkOut)}<small>${b.nights} night${b.nights > 1 ? 's' : ''}</small></td>
        <td>${roomsText(b.rooms)}</td>
        <td>${b.adults + b.children}</td>
        <td>${fmtTHB(b.total)}${b.status === 'cancelled' && b.cancellationFee ? `<small>Fee ${fmtTHB(b.cancellationFee)}</small>` : ''}</td>
        <td>${b.source === 'admin' ? 'Owner' : 'Website'}</td>
        <td><span class="status ${b.status}">${STATUS_LABEL[b.status]}</span></td>
        <td class="actions">
          ${b.status === 'pending' ? `<button data-confirm="${b.ref}" class="ok">Confirm</button><button data-cancel="${b.ref}">Decline</button>` : ''}
          ${b.status === 'confirmed' ? `<button data-cancel="${b.ref}">Cancel</button>` : ''}
          <button data-delete="${b.ref}" class="danger">Delete</button>
        </td>
      </tr>`).join('') : `<tr><td colspan="11" class="muted">No bookings found.</td></tr>`);
}
$('fSearch').addEventListener('input', renderBookings);
$('fStatus').addEventListener('change', renderBookings);

// View / confirm / cancel / delete buttons anywhere on the page
document.addEventListener('click', e => {
  const v = e.target.closest('[data-view]'), ok = e.target.closest('[data-confirm]'),
        c = e.target.closest('[data-cancel]'), d = e.target.closest('[data-delete]');
  if (v) { e.preventDefault(); openBooking(v.dataset.view); }
  if (ok) { confirmBooking(ok.dataset.confirm); closeModal(); renderAll(); }
  if (c) {
    const b = getBookings().find(x => x.ref === c.dataset.cancel);
    const { pct, fee } = cancellationFee(b);
    const msg = b.status === 'pending'
      ? `Decline booking request ${b.ref} from ${b.guest.first} ${b.guest.last}? The rooms will be released.`
      : `Cancel ${b.ref} for ${b.guest.first} ${b.guest.last}?\n\nCancellation fee under the policy: ${pct * 100}% = ${fmtTHB(fee)}`;
    if (confirm(msg)) { cancelBooking(b.ref); closeModal(); renderAll(); }
  }
  if (d) {
    const b = getBookings().find(x => x.ref === d.dataset.delete);
    if (confirm(`Permanently delete booking ${b.ref} (${b.guest.first} ${b.guest.last})?\nThis cannot be undone. Use Cancel instead to keep a record.`)) {
      deleteBooking(b.ref); closeModal(); renderAll();
    }
  }
});

// ---------- Booking details pop-up ----------
function openBooking(ref) {
  const b = getBookings().find(x => x.ref === ref);
  if (!b) return;
  const g = b.guest;
  $('modalBody').innerHTML = `
    <span class="eyebrow">${b.source === 'admin' ? 'Added by owner' : 'Website request'}</span>
    <h2>${b.ref} <span class="status ${b.status}">${STATUS_LABEL[b.status]}</span></h2>
    <dl class="sum-list">
      <dt>Received</dt><dd>${dateTime(b.createdAt)}</dd>
      <dt>Guest</dt><dd>${escapeHTML(g.first + ' ' + g.last)}</dd>
      <dt>Phone</dt><dd><a href="tel:${escapeHTML(g.phone)}">${escapeHTML(g.phone)}</a></dd>
      <dt>Email</dt><dd>${escapeHTML(g.email || '-')}</dd>
      <dt>Country</dt><dd>${escapeHTML(g.country || '-')}</dd>
      <dt>Arrival time</dt><dd>${escapeHTML(g.arrival || '-')}</dd>
      <dt>Requests / notes</dt><dd>${escapeHTML(g.requests || '-')}</dd>
      <dt>Check-in</dt><dd>${fmtDate(b.checkIn)}</dd>
      <dt>Check-out</dt><dd>${fmtDate(b.checkOut)} (${b.nights} night${b.nights > 1 ? 's' : ''})</dd>
      <dt>Guests</dt><dd>${b.adults} adults, ${b.children} children</dd>
      ${bookingLines(b).map(l => `<dt>${escapeHTML(typeById(l.typeId).name)}</dt><dd>${l.qty} room(s) × ${l.nights} night(s) · avg ${fmtTHB(l.avg)} = ${fmtTHB(l.amount)}</dd>`).join('')}
      <dt>Total</dt><dd><strong>${fmtTHB(b.total)}</strong></dd>
      ${b.status === 'cancelled' ? `<dt>Cancelled</dt><dd>${dateTime(b.cancelledAt)}${b.cancellationFee ? ` · fee ${fmtTHB(b.cancellationFee)}` : ''}</dd>` : ''}
    </dl>
    <div class="confirm-actions">
      <a class="btn btn-sm" target="_blank" href="https://wa.me/${g.phone.replace(/\D/g, '')}">WhatsApp Guest</a>
      ${b.status === 'pending' ? `<button class="btn btn-sm" data-confirm="${b.ref}">Confirm</button><button class="btn btn-line btn-sm" data-cancel="${b.ref}">Decline</button>` : ''}
      ${b.status === 'confirmed' ? `<button class="btn btn-line btn-sm" data-cancel="${b.ref}">Cancel Booking</button>` : ''}
      <button class="btn btn-line btn-sm danger" data-delete="${b.ref}">Delete</button>
    </div>`;
  $('modal').hidden = false;
}
const closeModal = () => $('modal').hidden = true;
$('modalClose').onclick = closeModal;
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

// ---------- CSV export ----------
$('exportCsv').onclick = () => {
  const head = ['Ref', 'Received', 'Status', 'Source', 'First', 'Last', 'Phone', 'Email', 'Country', 'Check-in', 'Check-out', 'Nights',
    ...ROOM_TYPES.map(t => t.beds), 'Adults', 'Children', 'Total THB', 'Cancellation fee THB', 'Requests'];
  const rows = getBookings().map(b => [b.ref, b.createdAt, STATUS_LABEL[b.status], b.source, b.guest.first, b.guest.last, b.guest.phone, b.guest.email,
    b.guest.country, b.checkIn, b.checkOut, b.nights, ...ROOM_TYPES.map(t => b.rooms[t.id] || 0), b.adults, b.children, b.total,
    b.cancellationFee || 0, b.guest.requests || '']);
  const csv = [head, ...rows].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `bookings-${todayISO()}.csv`;
  a.click();
};

// =========================================================
// ADD BOOKING
// =========================================================
$('aIn').min = todayISO();
function showAddAvailability() {
  const i = $('aIn').value, o = $('aOut').value;
  if (!i || !o || nightsBetween(i, o) < 1) { $('aAvail').textContent = ''; return; }
  const a = availability(i, o);
  const n = nightsBetween(i, o);
  const rooms = { single: Number($('aSingle').value), twin: Number($('aTwin').value) };
  $('aAvail').textContent = `Available for these dates: ${ROOM_TYPES.map(t => `${a[t.id]} × ${t.beds}`).join(', ')} · ` +
    `${n} night${n > 1 ? 's' : ''} · Total ${fmtTHB(priceStay(rooms, i, o).total)}`;
}
['aIn', 'aOut', 'aSingle', 'aTwin'].forEach(id => $(id).addEventListener('change', showAddAvailability));
$('addForm').addEventListener('submit', e => {
  e.preventDefault();
  $('aError').textContent = ''; $('aOk').textContent = '';
  const res = createBooking({
    checkIn: $('aIn').value, checkOut: $('aOut').value,
    rooms: { single: Number($('aSingle').value), twin: Number($('aTwin').value) },
    adults: Number($('aAdults').value), children: Number($('aChildren').value),
    guest: { first: $('aFirst').value.trim(), last: $('aLast').value.trim(), phone: $('aPhone').value.trim(),
      email: $('aEmail').value.trim(), country: $('aCountry').value.trim(), arrival: '-', requests: $('aNotes').value.trim() }
  }, 'admin');
  if (!res.ok) { $('aError').textContent = res.error; return; }
  $('aOk').textContent = `Booking ${res.booking.ref} added · ${fmtTHB(res.booking.total)}`;
  e.target.reset(); $('aAvail').textContent = '';
});

// ---------- Activity log ----------
function renderLog() {
  const log = getLog();
  $('logTable').innerHTML = `<tr><th>Time</th><th>Action</th><th>Details</th></tr>` +
    (log.length ? log.map(l => `<tr><td>${dateTime(l.time)}</td><td>${escapeHTML(l.action)}</td><td>${escapeHTML(l.detail)}</td></tr>`).join('')
      : `<tr><td colspan="3" class="muted">No activity yet.</td></tr>`);
}

// =========================================================
// RATES: standard + date ranges
// =========================================================
function renderRates() {
  const r = getBaseRates();
  $('baseRatesForm').innerHTML = ROOM_TYPES.map(t =>
    `<label>${escapeHTML(t.name)} (THB per night)<input type="number" min="0" step="50" id="base-${t.id}" value="${r[t.id]}" required></label>`).join('') +
    `<div class="full"><button class="btn" type="submit">Save Standard Rates</button></div>`;

  const periods = getRatePeriods().slice().sort((a, b) => a.from.localeCompare(b.from));
  $('periodsTable').innerHTML = `<tr><th>From</th><th>To</th><th>Nights</th>${ROOM_TYPES.map(t => `<th>${t.beds}</th>`).join('')}<th>Label</th><th></th></tr>` +
    (periods.length ? periods.map(p => `<tr class="${p.to < todayISO() ? 'cancelled' : ''}">
      <td>${fmtDate(p.from)}</td><td>${fmtDate(p.to)}</td><td>${nightsBetween(p.from, p.to) + 1}</td>
      ${ROOM_TYPES.map(t => `<td>${fmtTHB(p[t.id])}</td>`).join('')}
      <td>${escapeHTML(p.label || '-')}</td>
      <td class="actions"><button class="danger" data-delperiod="${p.id}">Delete</button></td></tr>`).join('')
      : `<tr><td colspan="${ROOM_TYPES.length + 5}" class="muted">No date-range rates. The standard rates apply to all dates.</td></tr>`);
}
$('baseRatesForm').addEventListener('submit', e => {
  e.preventDefault();
  const nr = {};
  ROOM_TYPES.forEach(t => nr[t.id] = Number($('base-' + t.id).value));
  setBaseRates(nr);
  $('baseOk').textContent = 'Standard rates saved.';
});
$('pFrom').addEventListener('change', () => { $('pTo').min = $('pFrom').value; if (!$('pTo').value || $('pTo').value < $('pFrom').value) $('pTo').value = $('pFrom').value; });
$('periodForm').addEventListener('submit', e => {
  e.preventDefault();
  $('pError').textContent = '';
  if ($('pTo').value < $('pFrom').value) return $('pError').textContent = 'The "To" date must be on or after the "From" date.';
  addRatePeriod({ from: $('pFrom').value, to: $('pTo').value, single: Number($('pSingle').value), twin: Number($('pTwin').value), label: $('pLabel').value.trim() });
  e.target.reset();
  renderRates();
});
document.addEventListener('click', e => {
  const del = e.target.closest('[data-delperiod]');
  if (del && confirm('Delete this date-range rate?')) { deleteRatePeriod(del.dataset.delperiod); renderRates(); }
});
$('rateCheck').addEventListener('submit', e => {
  e.preventDefault();
  const d = $('rcDate').value;
  $('rcOut').textContent = `${fmtDate(d)}: ` + ROOM_TYPES.map(t => `${t.beds} ${fmtTHB(rateForNight(t.id, d))}`).join(' · ');
});

// ---------- Change password ----------
$('pwForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('pwError').textContent = ''; $('pwOk').textContent = '';
  if (!(await checkPassword($('pOld').value))) return $('pwError').textContent = 'Old password is incorrect.';
  if ($('pNew').value !== $('pNew2').value) return $('pwError').textContent = 'New passwords do not match.';
  await setPassword($('pNew').value, 'from Account page');
  $('pwOk').textContent = 'Password updated.';
  e.target.reset();
});

function renderAll() { renderSummary(); renderBookings(); renderLog(); renderRates(); }
renderAll();