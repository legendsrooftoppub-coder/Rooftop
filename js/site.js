document.addEventListener('DOMContentLoaded', function(){
  // Stable loader: progressive bar, load/fallback completion, clean removal
  const loading = document.getElementById('loadingScreen');
  const bar = loading ? loading.querySelector('.progress-bar') : null;
  if (loading && bar) {
    let progress = 0;
    let finished = false;
    const tick = setInterval(() => {
      // Faster early progress, slower as it nears completion for perceived stability
      progress = Math.min(92, progress + (progress < 50 ? 6 : 3));
      bar.style.width = progress + '%';
    }, 120);

    const complete = () => {
      if (finished) return; finished = true;
      clearInterval(tick);
      requestAnimationFrame(() => {
        bar.style.width = '100%';
        setTimeout(() => loading.classList.add('hidden'), 180);
      });
    };

    const fallback = setTimeout(complete, 2600); // ensure hide even if 'load' is slow
    window.addEventListener('load', () => { clearTimeout(fallback); complete(); });
    loading.addEventListener('transitionend', () => {
      if (loading.classList.contains('hidden')) { try { loading.remove(); } catch(_) {} }
    });
  }

  const cartCountEl = document.getElementById('cart-count');
  const updateCount = () => {
    try {
      const cart = JSON.parse(localStorage.getItem('legendsCart')||'[]');
      const total = cart.reduce((t,i)=>t+(i.quantity||0),0);
      if (cartCountEl) cartCountEl.textContent = total;
    } catch(_) {}
  };
  updateCount();
  window.addEventListener('storage', (e) => { if (e.key==='legendsCart') updateCount(); });

  // Mobile navigation: hamburger toggle and close-on-link
  const hamburger = document.getElementById('hamburger');
  const navMenu = document.getElementById('nav-menu');
  if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
      // Toggle nav open/close on all viewports
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }

  // Navbar shadow on scroll for better mobile perception
  const navbar = document.getElementById('navbar');
  if (navbar) {
    const onScroll = () => {
      if (window.scrollY > 100) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Inject mobile quick links dropdown into header for easy page navigation
  (function ensureMobileDropdown(){
    const host = document.getElementById('navbar') || document.querySelector('.enhanced-nav');
    if (!host) return;
    if (document.getElementById('mobile-quick-links')) return; // avoid duplicates
    const container = host.querySelector('.nav-container') || host;
    const wrap = document.createElement('div');
    wrap.id = 'mobile-quick-links';
    wrap.className = 'mobile-quick-links';
    wrap.innerHTML = `
      <i class="fas fa-bars" aria-hidden="true"></i>
      <label for="mobile-quick-select" class="sr-only">Quick links</label>
      <select id="mobile-quick-select" aria-label="Quick links">
        <option value="">Navigate…</option>
        <option value="index.html">Home</option>
        <option value="about.html">About Us</option>
        <option value="Menuu.html">Menu</option>
        <option value="gallery.html">Gallery</option>
        <option value="booking.html">Bookings</option>
        <option value="checkout.html">Checkout</option>
      </select>`;
    container.appendChild(wrap);
    const sel = wrap.querySelector('select');
    const current = (location.pathname.split('/').pop()||'').toLowerCase();
    Array.from(sel.options).forEach(opt => {
      if ((opt.value||'').toLowerCase() === current) opt.selected = true;
    });
    sel.addEventListener('change', (e)=>{
      const url = e.target.value;
      if (url) { window.location.href = url; }
    });

    // Styles
    const style = document.createElement('style');
    style.textContent = `
      .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0}
      .mobile-quick-links{display:none;}
      @media(max-width: 768px){
        .mobile-quick-links{display:flex;align-items:center;gap:8px;margin-left:auto;background:rgba(255,255,255,0.92);border:1px solid rgba(0,0,0,0.08);box-shadow:0 6px 16px rgba(0,0,0,0.12);border-radius:10px;padding:6px 10px}
        .mobile-quick-links select{appearance:none;-webkit-appearance:none;-moz-appearance:none;background:transparent;border:none;font-weight:600;color:#1A1A1A;padding:6px 2px}
        .mobile-quick-links i{color:#FF6B35}
      }
    `;
    document.head.appendChild(style);
  })();

  // Inject WhatsApp floating button across pages
  (function ensureWhatsAppFloat(){
    if (!document.getElementById('whatsapp-float')) {
      const a = document.createElement('a');
      a.id = 'whatsapp-float';
      a.className = 'whatsapp-float';
      a.target = '_blank';
      a.rel = 'noopener';
      a.innerHTML = '<i class="fab fa-whatsapp"></i>';
      document.body.appendChild(a);
      const style = document.createElement('style');
      style.textContent = '.whatsapp-float{position:fixed;right:16px;bottom:16px;background:#25D366;color:#fff;width:52px;height:52px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 16px rgba(0,0,0,.2);z-index:1000;text-decoration:none} .whatsapp-float i{font-size:1.5rem;} .whatsapp-float:hover{filter:brightness(1.1);}';
      document.head.appendChild(style);
    }
    const btn = document.getElementById('whatsapp-float');
    const currency = (n)=> 'R'+(Number(n||0).toFixed(2));
    const buildMessage = ()=>{
      const cart = getSafeCart();
      const count = cart.reduce((t,i)=>t+(i.quantity||0),0);
      if (!count) return `Hello Legends Rooftop, I\'d like to order or book.\nFrom: ${window.location.href}`;
      const lines = cart.map(i=>{
        const extra=[]; if (Array.isArray(i.exclusions)&&i.exclusions.length) extra.push(`Excl: ${i.exclusions.join(', ')}`); if (i.notes) extra.push(`Notes: ${i.notes}`);
        const tail = extra.length ? ` (${extra.join(' | ')})` : '';
        return `${i.name} x ${i.quantity} = ${currency((i.price||0)*(i.quantity||0))}${tail}`;
      }).join('\n');
      // Derive delivery from page if available
      let delivery = 0; let subtotal = cart.reduce((s,i)=>s+(i.price||0)*(i.quantity||0),0);
      const delEl = document.getElementById('summary-delivery');
      const subEl = document.getElementById('summary-subtotal');
      const totEl = document.getElementById('summary-total');
      const distInput = document.getElementById('distance-km');
      const deliverySelect = document.getElementById('delivery-option');
      const option = deliverySelect ? deliverySelect.value : 'delivery';
      if (delEl && subEl && totEl) {
        // Use existing totals if on checkout page
        const d = parseFloat(String(delEl.textContent).replace(/[^0-9.]/g,''));
        delivery = isNaN(d) ? 0 : d;
        const s = parseFloat(String(subEl.textContent).replace(/[^0-9.]/g,''));
        subtotal = isNaN(s) ? subtotal : s;
      } else {
        // Fallback: base + per-km after 5km
        let km = 5; if (distInput) { const v=parseFloat(distInput.value); if(!isNaN(v)&&v>=0) km=v; }
        const base = (option==='pickup')?0:30; delivery = (option==='pickup')?0:(km<=5?base:base+(km-5)*4.75);
      }
      const total = subtotal + delivery;
      const msg = `Order Preview\n${lines}\nSubtotal: ${currency(subtotal)}\nDelivery: ${currency(delivery)}\nTotal: ${currency(total)}\nFrom: ${window.location.href}`;
      return msg;
    };
    const update = ()=>{ if (btn) btn.href = 'HTTPS://wa.me/27787348487?text=' + encodeURIComponent(buildMessage()); };
    update();
    window.addEventListener('storage', (e)=>{ if (e.key==='legendsCart') update(); });
  })();

  // Make footer social links clickable
  (function wireSocialLinks(){
    const map = {
      'fa-facebook-f': 'https://www.facebook.com/people/legends-rooftop-pub-restaurant/61553981411472/',
      'fa-instagram': 'https://instagram.com/legendsrooftop',
      'fa-twitter': 'https://x.com/LegendsRooftop',
      'fa-whatsapp': 'HTTPS://wa.me/27787348487',
      // TikTok provided by user
      'fa-tiktok': 'https://www.tiktok.com/@legendsrooftop_pub?is_from_webapp=1&sender_device=pc'
    };
    document.querySelectorAll('.social-link').forEach(a => {
      const icon = a.querySelector('i');
      if (!icon) return;
      for (const cls of icon.classList) {
        if (map[cls]) { a.href = map[cls]; a.target = '_blank'; a.rel = 'noopener'; break; }
      }
    });
  })();

  // Unified cart module
  (function initLegendsCart(){
    if (window.LegendsCart) return; // avoid re-init
    const storageKey = 'legendsCart';
    const pendingKey = 'pendingOrderItems';
    const safeRead = (key)=>{ try { return JSON.parse(localStorage.getItem(key)||'[]'); } catch(_) { return []; } };
    const safeWrite = (key, val)=>{ try { localStorage.setItem(key, JSON.stringify(val)); } catch(_){} };
    const variantKeyFor = (item)=>{
      const ex = Array.isArray(item.exclusions) ? item.exclusions.slice().sort() : [];
      const notes = (item.notes||'').trim();
      return `${item.id}|${ex.join(',')}|${notes}`;
    };
    const api = {
      get(){ return safeRead(storageKey); },
      set(items){ safeWrite(storageKey, Array.isArray(items)?items:[]); window.dispatchEvent(new StorageEvent('storage',{ key: storageKey })); },
      clear(){ this.set([]); },
      add(item){
        const cart = this.get();
        const payload = { id: String(item.id), name: item.name, price: Number(item.price)||0, quantity: Number(item.quantity)||1, exclusions: item.exclusions||[], notes: item.notes||'', variantKey: item.variantKey || variantKeyFor(item) };
        const idx = cart.findIndex(i => String(i.variantKey||variantKeyFor(i)) === String(payload.variantKey));
        if (idx !== -1) cart[idx].quantity += payload.quantity; else cart.push(payload);
        this.set(cart);
        return payload;
      },
      removeByIndex(idx){ const cart=this.get(); if(cart[idx]){ cart.splice(idx,1); this.set(cart); } },
      updateQty(idx, delta){ const cart=this.get(); if(!cart[idx]) return; cart[idx].quantity=Math.max(0,(cart[idx].quantity||1)+delta); const next=cart.filter(i=> (i.quantity||0)>0); this.set(next); },
      subtotal(){ return this.get().reduce((s,i)=> s+(i.price||0)*(i.quantity||0),0); },
      // Pending helpers to coordinate with menu pages
      getPending(){ return safeRead(pendingKey); },
      setPending(items){ safeWrite(pendingKey, Array.isArray(items)?items:[]); },
      addPending(item){ const items=this.getPending(); const payload={ id:String(item.id), name:item.name, price:Number(item.price)||0, quantity:Number(item.quantity)||1, exclusions:item.exclusions||[], notes:item.notes||'', variantKey:item.variantKey||variantKeyFor(item) }; const idx=items.findIndex(i=>String(i.variantKey||variantKeyFor(i))===String(payload.variantKey)); if(idx!==-1) items[idx].quantity+=payload.quantity; else items.push(payload); this.setPending(items); return payload; },
      mergePendingIntoCart(){ const pending=this.getPending(); if(!pending.length) return; const cart=this.get(); pending.forEach(p=>{ const idx=cart.findIndex(i=>String(i.variantKey||variantKeyFor(i))===String(p.variantKey||variantKeyFor(p))); if(idx!==-1) cart[idx].quantity+=p.quantity; else cart.push(p); }); this.set(cart); }
    };
    window.LegendsCart = api;
    // Compact accessor for other scripts
    window.getSafeCart = ()=> api.get();
  })();

  function getSafeCart(){ try { return JSON.parse(localStorage.getItem('legendsCart')||'[]'); } catch(_) { return []; } }
});
