/* Booking flow: 1 Dates & guests → 2 Select room → 3 Review & request → 4 Request received */

const S = { checkIn: '', checkOut: '', nights: 0, roomsCount: 1, adults: 2, children: 0, rooms: {} };
const $ = id => document.getElementById(id);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

// ---------- Step navigation ----------
function showStep(n) {
  [1, 2, 3, 4].forEach(i => $('step' + i).hidden = i !== n);
  document.querySelectorAll('#stepper li').forEach(li => {
    const s = Number(li.dataset.step);
    li.classList.toggle('active', s === n);
    li.classList.toggle('done', s < n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => showStep(Number(b.dataset.goto))));

// ---------- Step 1: search ----------
const fillSelect = (el, from, to, sel) => {
  el.innerHTML = '';
  for (let i = from; i <= to; i++) el.add(new Option(i, i, false, i === sel));
};
fillSelect($('roomsCount'), 1, TOTAL_ROOMS, 1);
fillSelect($('adults'), 1, TOTAL_ROOMS * MAX_GUESTS_PER_ROOM, 2);
fillSelect($('children'), 0, TOTAL_ROOMS * MAX_GUESTS_PER_ROOM - 1, 0);

const today = todayISO();
$('checkIn').min = today;
$('checkOut').min = addDays(today, 1);
$('checkIn').addEventListener('change', () => {
  $('checkOut').min = addDays($('checkIn').value, 1);
  if (!$('checkOut').value || $('checkOut').value <= $('checkIn').value) $('checkOut').value = addDays($('checkIn').value, 1);
});

// Pre-fill from the home page quick search
const q = new URLSearchParams(location.search);
if (q.get('in')) $('checkIn').value = q.get('in');
if (q.get('out')) $('checkOut').value = q.get('out');
if (q.get('rooms')) $('roomsCount').value = q.get('rooms');
if (q.get('adults')) $('adults').value = q.get('adults');
if (q.get('children')) $('children').value = q.get('children');

$('searchForm').addEventListener('submit', e => {
  e.preventDefault();
  const err = $('searchError');
  err.textContent = '';
  S.checkIn = $('checkIn').value;
  S.checkOut = $('checkOut').value;
  S.roomsCount = Number($('roomsCount').value);
  S.adults = Number($('adults').value);
  S.children = Number($('children').value);
  S.nights = nightsBetween(S.checkIn, S.checkOut);

  if (S.checkIn < today) return err.textContent = 'Check-in cannot be in the past.';
  if (S.nights < 1) return err.textContent = 'Please choose a check-out date at least 1 night after check-in.';
  const guests = S.adults + S.children;
  if (guests > S.roomsCount * MAX_GUESTS_PER_ROOM)
    return err.textContent = `${guests} guests need at least ${Math.ceil(guests / MAX_GUESTS_PER_ROOM)} rooms (maximum ${MAX_GUESTS_PER_ROOM} per room, including children).`;

  const avail = availability(S.checkIn, S.checkOut);
  const totalFree = Object.values(avail).reduce((a, b) => a + b, 0);
  if (totalFree < S.roomsCount)
    return err.textContent = totalFree
      ? `Only ${totalFree} room(s) are available for these dates. Please reduce the number of rooms or change your dates.`
      : 'Sorry, we are fully booked for these dates. Please try different dates.';

  S.rooms = {};
  ROOM_TYPES.forEach(t => S.rooms[t.id] = 0);
  renderRooms(avail);
  showStep(2);
});

// ---------- Step 2: room selection ----------
function guestsText(adults, children) {
  return plural(adults, 'adult') + (children ? `, ${children} child${children > 1 ? 'ren' : ''}` : '');
}
function renderRooms(avail) {
  $('stayLine').textContent =
    `${fmtDate(S.checkIn)} → ${fmtDate(S.checkOut)} · ${plural(S.nights, 'night')} · ${plural(S.roomsCount, 'room')} · ${guestsText(S.adults, S.children)}`;

  $('roomOptions').innerHTML = ROOM_TYPES.map(t => {
    const left = avail[t.id];
    const max = Math.min(left, S.roomsCount);
    const one = priceStay({ [t.id]: 1 }, S.checkIn, S.checkOut).lines[0];   // price of 1 room for this stay
    const varies = new Set(one.nightly.map(n => n.rate)).size > 1;
    return `
      <article class="room-option ${left ? '' : 'sold-out'}" data-id="${t.id}">
        <img src="${t.photo}" alt="${escapeHTML(t.name)}" class="zoom">
        <div class="room-option-body">
          <h3>${escapeHTML(t.name)}</h3>
          <p class="muted">Sleeps up to ${t.maxGuests} guests · ${left ? `${left} of ${t.count} available` : 'Sold out for these dates'}</p>
          <ul class="features">${t.features.map(f => `<li>${escapeHTML(f)}</li>`).join('')}</ul>
        </div>
        <div class="room-option-price">
          <span class="label">${varies ? 'Average Rate' : 'Rate'}</span>
          <div class="rate">${fmtTHB(one.avg)}</div>
          <span class="muted">per room / night</span>
          <span class="muted">${fmtTHB(one.amount)} for ${plural(S.nights, 'night')}</span>
          ${left ? `
          <div class="qty" data-max="${max}">
            <button type="button" data-d="-1" aria-label="Fewer">−</button>
            <span>0</span>
            <button type="button" data-d="1" aria-label="More">+</button>
          </div>` : ''}
        </div>
      </article>`;
  }).join('');

  document.querySelectorAll('.room-option .qty').forEach(qEl => {
    const id = qEl.closest('.room-option').dataset.id;
    qEl.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
      const chosen = Object.values(S.rooms).reduce((a, b) => a + b, 0);
      const d = Number(btn.dataset.d);
      const next = S.rooms[id] + d;
      if (next < 0 || next > Number(qEl.dataset.max)) return;
      if (d > 0 && chosen >= S.roomsCount) return;
      S.rooms[id] = next;
      qEl.querySelector('span').textContent = next;
      qEl.closest('.room-option').classList.toggle('selected', next > 0);
      updateSelectBar();
    }));
  });
  document.querySelectorAll('.room-option img.zoom').forEach(img => img.addEventListener('click', () => {
    const lb = document.getElementById('lightbox');
    if (lb) { document.getElementById('lightboxImg').src = img.src; lb.classList.add('show'); }
  }));
  updateSelectBar();
}
function updateSelectBar() {
  const chosen = Object.values(S.rooms).reduce((a, b) => a + b, 0);
  const { total } = priceStay(S.rooms, S.checkIn, S.checkOut);
  $('selectStatus').innerHTML = `Selected <strong>${chosen} of ${S.roomsCount}</strong> room${S.roomsCount > 1 ? 's' : ''}` +
    (chosen ? ` · Total <strong>${fmtTHB(total)}</strong>` : '');
  $('toReview').disabled = chosen !== S.roomsCount;
}
$('toReview').addEventListener('click', () => {
  const { lines, total } = priceStay(S.rooms, S.checkIn, S.checkOut);
  $('summary').innerHTML = summaryHTML({ ...S, lines, total });
  showStep(3);
});

// ---------- Summary card (step 3 and step 4) ----------
function summaryHTML(b) {
  const lines = b.lines;
  return `
    <h3>Stay Summary</h3>
    <dl class="sum-list">
      <dt>Check-in</dt><dd>${fmtDate(b.checkIn)}<small>from 2:00 PM</small></dd>
      <dt>Check-out</dt><dd>${fmtDate(b.checkOut)}<small>by 12:00 PM</small></dd>
      <dt>Nights</dt><dd>${b.nights}</dd>
      <dt>Rooms</dt><dd>${lines.reduce((s, l) => s + l.qty, 0)}</dd>
      <dt>Guests</dt><dd>${b.adults + b.children} (${guestsText(b.adults, b.children)})</dd>
    </dl>
    <h4>Room Details</h4>
    ${lines.map(l => {
      const t = typeById(l.typeId);
      const varies = new Set(l.nightly.map(n => n.rate)).size > 1;
      return `
      <div class="sum-room">
        <strong>${escapeHTML(t.name)}</strong>
        <span>${plural(l.qty, 'room')} × ${plural(l.nights, 'night')} × ${varies ? 'avg ' : ''}${fmtTHB(l.avg)}</span>
        <span class="amt">${fmtTHB(l.amount)}</span>
      </div>`;
    }).join('')}
    <h4>Summary of Charges</h4>
    <div class="sum-row"><span>Room charges</span><span>${fmtTHB(b.total)}</span></div>
    <div class="sum-row"><span>Taxes &amp; fees</span><span>Included</span></div>
    <div class="sum-row total"><span>Total</span><span>${fmtTHB(b.total)}</span></div>
    <p class="sum-policy">Payment is arranged with the farm stay after confirmation.<br>
      Cancellation: 20% fee if cancelled more than 24 hours before check-in; 100% within 24 hours.</p>`;
}

// ---------- Step 3: send the booking request ----------
$('guestForm').addEventListener('submit', e => {
  e.preventDefault();
  $('payError').textContent = '';
  const result = createBooking({
    checkIn: S.checkIn, checkOut: S.checkOut, rooms: { ...S.rooms }, adults: S.adults, children: S.children,
    guest: {
      first: $('gFirst').value.trim(), last: $('gLast').value.trim(), email: $('gEmail').value.trim(),
      phone: $('gPhone').value.trim(), country: $('gCountry').value.trim(),
      arrival: $('gArrival').value, requests: $('gRequests').value.trim()
    }
  }, 'website');
  if (!result.ok) return $('payError').textContent = result.error;
  renderConfirmation(result.booking);
  showStep(4);
});

// ---------- Step 4: request received ----------
function renderConfirmation(b) {
  const msg =
    `Booking request ${b.ref}\n` +
    `Guest: ${b.guest.first} ${b.guest.last} (${b.guest.country})\n` +
    `Phone: ${b.guest.phone} · Email: ${b.guest.email}\n` +
    `Check-in: ${b.checkIn} · Check-out: ${b.checkOut} (${b.nights} night/s)\n` +
    ROOM_TYPES.filter(t => b.rooms[t.id]).map(t => `${b.rooms[t.id]} × ${t.name}`).join(', ') + '\n' +
    `Guests: ${b.adults} adults, ${b.children} children\n` +
    `Total: ${fmtTHB(b.total)}\n` +
    (b.guest.requests ? `Requests: ${b.guest.requests}` : '');

  $('confirmBox').innerHTML = `
    <div class="confirm-head">
      <div class="tick">✓</div>
      <span class="eyebrow">Booking Request Received</span>
      <h1 class="step-title">Thank you, ${escapeHTML(b.guest.first)}!</h1>
      <p>Your rooms are being held. We will contact you shortly to confirm your booking and arrange payment.</p>
      <p class="ref">Reference number <strong>${b.ref}</strong></p>
    </div>
    <div class="review-grid">
      <div class="review-main">
        <div class="panel">
          <h3>Guest Information</h3>
          <dl class="sum-list">
            <dt>Name</dt><dd>${escapeHTML(b.guest.first + ' ' + b.guest.last)}</dd>
            <dt>Email</dt><dd>${escapeHTML(b.guest.email)}</dd>
            <dt>Phone</dt><dd>${escapeHTML(b.guest.phone)}</dd>
            <dt>Country</dt><dd>${escapeHTML(b.guest.country)}</dd>
            <dt>Arrival</dt><dd>${escapeHTML(b.guest.arrival)}</dd>
            ${b.guest.requests ? `<dt>Requests</dt><dd>${escapeHTML(b.guest.requests)}</dd>` : ''}
          </dl>
        </div>
        <div class="confirm-actions">
          <a class="btn" target="_blank" href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}">Send Request via WhatsApp</a>
          <button class="btn btn-line" onclick="window.print()">Print</button>
          <a class="btn btn-line" href="index.html">Back to Home</a>
        </div>
      </div>
      <aside class="summary">${summaryHTML(b)}</aside>
    </div>`;
}

showStep(1);
if (q.get('in') && q.get('out')) $('searchForm').requestSubmit();