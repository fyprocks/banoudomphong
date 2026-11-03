/* =========================================================
   Shared script for every page.
   The navbar and footer are written here ONCE and added to
   every page automatically, so edit them only in this file.
   ========================================================= */

// ---------- Settings ----------
const PHONE_DISPLAY   = '+66 96 195 6282';
const PHONE_LINK      = '+66961956282';
const WHATSAPP_NUMBER = '66961956282'; // country code + number, no "+" or spaces
const MAPS_URL = 'https://www.google.com/maps/place/Ban+Oudomphong+Farm+Stay+Udon+thani/@17.4965262,102.8085091,17z/data=!3m1!4b1!4m6!3m5!1s0x3123796e10d4afdd:0xed0dc369c6ca9669!8m2!3d17.4965262!4d102.811084!16s%2Fg%2F11npc_1782';

// ---------- Navbar ----------
const header = document.getElementById('site-header');
if (header) {
  header.outerHTML = `
  <header class="navbar" id="navbar">
    <a href="index.html" class="logo"><strong>Ban Oudomphong</strong><small>Farm Stay · Udon Thani</small></a>
    <nav>
      <ul class="nav-links" id="navLinks">
        <li><a href="index.html">Home</a></li>
        <li><a href="accommodation.html">Accommodation</a></li>
        <li><a href="dining.html">Dining</a></li>
        <li><a href="experiences.html">Experiences</a></li>
        <li><a href="gallery.html">Gallery</a></li>
        <li><a href="book.html" class="nav-book">Reserve</a></li>
      </ul>
    </nav>
    <button class="menu-toggle" id="menuToggle" aria-label="Open menu">&#9776;</button>
  </header>`;
}

// ---------- Footer ----------
const footer = document.getElementById('site-footer');
if (footer) {
  footer.outerHTML = `
  <footer class="footer">
    <div class="container footer-grid">
      <div>
        <a href="index.html" class="logo"><strong>Ban Oudomphong</strong><small>Farm Stay · Udon Thani</small></a>
        <p>A countryside retreat in the heart of Isan, where Thai hospitality meets international comfort.</p>
      </div>
      <div>
        <h4>Explore</h4>
        <ul>
          <li><a href="accommodation.html">Accommodation &amp; Rates</a></li>
          <li><a href="dining.html">Restaurant &amp; Dining</a></li>
          <li><a href="experiences.html">Experiences</a></li>
          <li><a href="gallery.html">Gallery</a></li>
          <li><a href="book.html">Reserve a Room</a></li>
        </ul>
      </div>
      <div>
        <h4>Contact</h4>
        <ul>
          <li><a href="tel:${PHONE_LINK}">${PHONE_DISPLAY}</a></li>
          <li><a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank">WhatsApp</a></li>
          <li>252 Tambon Kut Sa, Mueang Udon Thani, Udon Thani 41000, Thailand</li>
          <li><a href="${MAPS_URL}" target="_blank">View on Google Maps</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">© ${new Date().getFullYear()} Ban Oudomphong Farm Stay. All rights reserved. · <a href="login.html">Owner Login</a></div>
  </footer>`;
}

// ---------- Highlight the current page in the menu ----------
const currentPage = location.pathname.split('/').pop() || 'index.html';

// ---------- Owner Login link in the top menu (home page only, for now) ----------
if (currentPage === 'index.html') {
  const nl = document.getElementById('navLinks');
  if (nl) nl.insertAdjacentHTML('beforeend', '<li><a href="login.html" class="nav-owner">Owner Login</a></li>');
}
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.getAttribute('href') === currentPage) a.classList.add('active');
});

// ---------- Navbar turns white on scroll ----------
const navbar = document.getElementById('navbar');
const solidNav = document.body.classList.contains('solid-nav');   // pages without a big photo at the top
const onScroll = () => navbar && navbar.classList.toggle('scrolled', solidNav || window.scrollY > 60);
window.addEventListener('scroll', onScroll);
onScroll();

// ---------- Mobile menu ----------
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
if (menuToggle) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navbar.classList.add('scrolled');
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => navLinks.classList.remove('open')));
}

// ---------- Room photo switcher (Accommodation page) ----------
const roomMain = document.getElementById('roomMain');
document.querySelectorAll('.room-thumbs img').forEach(thumb => {
  thumb.addEventListener('click', () => {
    roomMain.src = thumb.src;
    document.querySelectorAll('.room-thumbs img').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
  });
});

// ---------- Lightbox: click any image with class "zoom" ----------
document.body.insertAdjacentHTML('beforeend',
  '<div class="lightbox" id="lightbox"><span class="close" id="closeLightbox">&times;</span><img id="lightboxImg" alt=""></div>');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
document.querySelectorAll('.zoom').forEach(img => {
  img.addEventListener('click', () => { lightboxImg.src = img.src; lightbox.classList.add('show'); });
});
const closeLightbox = () => lightbox.classList.remove('show');
document.getElementById('closeLightbox').addEventListener('click', closeLightbox);
lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// ---------- Quick availability search (Home page) → opens book.html ----------
const quick = document.getElementById('quickSearch');
if (quick) {
  const qi = document.getElementById('qIn'), qo = document.getElementById('qOut');
  const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset());
  qi.min = t.toISOString().slice(0, 10);
  qi.addEventListener('change', () => {
    const d = new Date(qi.value + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1);
    qo.min = d.toISOString().slice(0, 10);
    if (!qo.value || qo.value <= qi.value) qo.value = qo.min;
  });
  quick.addEventListener('submit', e => {
    e.preventDefault();
    const p = new URLSearchParams({
      in: qi.value, out: qo.value,
      rooms: document.getElementById('qRooms').value,
      adults: document.getElementById('qAdults').value,
      children: document.getElementById('qChildren').value
    });
    location.href = 'book.html?' + p.toString();
  });
}

// ---------- Show live room rates on any element with data-rate="single" / "twin" ----------
if (typeof getRates === 'function') {
  const r = getRates();
  document.querySelectorAll('[data-rate]').forEach(el => el.textContent = fmtTHB(r[el.dataset.rate]));
}