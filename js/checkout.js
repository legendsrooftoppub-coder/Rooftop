document.addEventListener('DOMContentLoaded', function(){
  const itemsEl = document.getElementById('summary-items');
  const subtotalEl = document.getElementById('summary-subtotal');
  const deliveryEl = document.getElementById('summary-delivery');
  const totalEl = document.getElementById('summary-total');
  // Mobile sticky action bar (injected)
  let mobileBarTotalEl = null;
  (function injectMobileActionBar(){
    if (document.getElementById('mobile-action-bar')) return;
    const bar = document.createElement('div');
    bar.id = 'mobile-action-bar';
    bar.className = 'mobile-action-bar';
    bar.innerHTML = `
      <div class="bar-total">Total: <span class="bar-total-value">R0.00</span></div>
      <button type="button" class="btn btn-primary" id="mobile-confirm">Confirm Order</button>`;
    document.body.appendChild(bar);
    mobileBarTotalEl = bar.querySelector('.bar-total-value');
    const confirmBtn = bar.querySelector('#mobile-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', ()=>{
        const form = document.getElementById('checkout-form');
        if (form) form.requestSubmit();
        else window.location.href = 'checkout.html';
      });
    }
  })();
  const form = document.getElementById('checkout-form');
  const toastContainer = document.getElementById('toast-container');

  let deliveryOption = 'delivery';
  const eftDetails = document.getElementById('eft-details');

  // Cart helpers: delegate to unified LegendsCart API when available
  function getCart(){
    if (window.LegendsCart && typeof window.LegendsCart.get === 'function') return window.LegendsCart.get();
    try { return JSON.parse(localStorage.getItem('legendsCart')||'[]'); } catch(_) { return []; }
  }
  function setCart(c){
    if (window.LegendsCart && typeof window.LegendsCart.set === 'function') { try { window.LegendsCart.set(c); } catch(_){} return; }
    try { localStorage.setItem('legendsCart', JSON.stringify(c)); } catch(_){}
  }
  function calcDelivery(){
    if (deliveryOption==='pickup') return 0;
    const input = document.getElementById('distance-km');
    let km = 5;
    if (input) {
      const v = parseFloat(input.value);
      if (!isNaN(v) && v >= 0) km = v;
    }
    const base = 30; // R30 minimum
    if (km <= 5) return base;
    return base + (km - 5) * 4.75;
  }
  function currency(n){ return 'R'+n.toFixed(2); }
  function composeWhatsAppText(cart){
    const lines = Array.isArray(cart) ? cart.map(i=>{
      const extra = [];
      if (Array.isArray(i.exclusions) && i.exclusions.length) extra.push(`Excl: ${i.exclusions.join(', ')}`);
      if (i.notes) extra.push(`Notes: ${i.notes}`);
      const tail = extra.length ? ` (${extra.join(' | ')})` : '';
      return `${i.name} x ${i.quantity} = ${currency((i.price||0)*(i.quantity||0))}${tail}`;
    }).join('\n') : '';
    const d = calcDelivery();
    const subtotal = Array.isArray(cart) ? cart.reduce((s,i)=>s+(i.price||0)*(i.quantity||0),0) : 0;
    const t = subtotal + d;
    const distVal=document.getElementById('distance-km')?.value.trim()||'';
    const addrParts=['street','suburb','city','postal-code'].map(id=>document.getElementById(id)?.value.trim()||'');
    const addr = addrParts.filter(Boolean).join(', ');
    const text = `Order Preview\n${lines}\nOrder type: ${deliveryOption}${addr?`\nAddress: ${addr}`:''}${distVal?`\nDistance: ${distVal} km`:''}\nDelivery: ${currency(d)}\nTotal: ${currency(t)}`;
    return text;
  }
  function toast(msg,type){
    const el=document.createElement('div');
    el.className='toast '+(type||'info');
    el.textContent=msg;
    toastContainer.appendChild(el);
    setTimeout(()=>{ el.classList.add('show'); }, 10);
    setTimeout(()=>{ el.classList.remove('show'); if(el.parentNode) el.parentNode.removeChild(el); },3000);
  }
  function render(){
    const cart=getCart();
    if (Array.isArray(cart) && cart.length === 0) {
      itemsEl.innerHTML = '<div class="summary-empty">Your cart is empty. Add items from the menu.</div>';
    } else {
      itemsEl.innerHTML='';
    }
    let subtotal=0;
    cart.forEach((i,idx)=>{
      const row=document.createElement('div');
      row.className='summary-item';
      const extraParts=[];
      if (Array.isArray(i.exclusions) && i.exclusions.length) extraParts.push(`Excl: ${i.exclusions.join(', ')}`);
      if (i.notes) extraParts.push(`Notes: ${i.notes}`);
      const extra = extraParts.length ? `<div class="summary-extra">${extraParts.join(' | ')}</div>` : '';
      row.innerHTML=`
        <span>${i.name}${extra}</span>
        <span style="display:flex;gap:8px;align-items:center;">
          <button type="button" class="qty-btn" data-action="dec" data-index="${idx}" aria-label="Decrease">−</button>
          <span>${i.quantity}</span>
          <button type="button" class="qty-btn" data-action="inc" data-index="${idx}" aria-label="Increase">+</button>
          <button type="button" class="qty-btn" data-action="rm" data-index="${idx}" aria-label="Remove">✕</button>
          <span>${currency(i.price*i.quantity)}</span>
        </span>`;
      itemsEl.appendChild(row);
      subtotal+=i.price*i.quantity;
    });
    const delivery=calcDelivery();
    subtotalEl.textContent=currency(subtotal);
    deliveryEl.textContent=currency(delivery);
    totalEl.textContent=currency(subtotal+delivery);
    if (mobileBarTotalEl) mobileBarTotalEl.textContent = currency(subtotal+delivery);
    const bar = document.getElementById('mobile-action-bar');
    if (bar) bar.classList.toggle('active', (Array.isArray(cart) && cart.reduce((t,i)=>t+(i.quantity||0),0) > 0));

    // Update WhatsApp share link live (not only on submit)
    const share = document.getElementById('share-order');
    if (share) {
      share.setAttribute('href','https://wa.me/27787348487?text='+encodeURIComponent(composeWhatsAppText(cart)));
    }
  }

  // Handle quantity adjustments and item removal
  itemsEl.addEventListener('click', (e)=>{
    const btn = e.target.closest('.qty-btn');
    if(!btn) return;
    const idx = parseInt(btn.dataset.index,10);
    const action = btn.dataset.action;
    const cart = getCart();
    if(isNaN(idx) || !cart[idx]) return;
    if(action==='inc') cart[idx].quantity = (cart[idx].quantity||1) + 1;
    if(action==='dec') cart[idx].quantity = Math.max(0,(cart[idx].quantity||1) - 1);
    if(action==='rm') cart[idx].quantity = 0;
    const next = cart.filter(i=> (i.quantity||0) > 0);
    setCart(next);
    render();
  });

  const deliverySelect = document.getElementById('delivery-option');
  if (deliverySelect) deliverySelect.addEventListener('change', e=>{ deliveryOption=e.target.value; render(); });

  // Toggle EFT details when EFT is selected
  document.querySelectorAll('.payment-method').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.payment-method').forEach(b=>{ b.classList.remove('selected'); b.classList.remove('active'); });
      btn.classList.add('selected');
      btn.classList.add('active');
      const method = btn.dataset.method;
      if (eftDetails) eftDetails.style.display = (method === 'eft' ? 'block' : 'none');
    });
  });

  // Recalculate delivery when distance changes
  const distInput = document.getElementById('distance-km');
  if (distInput) distInput.addEventListener('input', render);

  // Live sync: re-render when cart changes elsewhere
  window.addEventListener('storage', (e)=>{ if (e.key==='legendsCart') render(); });

  // ===== Google Maps: Autocomplete, Map, Distance =====
  let map, marker, autocomplete, geocoder, distanceService;
  // Read origin coordinates from meta tags if provided; fallback to Durban CBD
  const origin = (function(){
    const latMeta = document.querySelector('meta[name="gmaps-origin-lat"]')?.content;
    const lngMeta = document.querySelector('meta[name="gmaps-origin-lng"]')?.content;
    const lat = parseFloat(latMeta);
    const lng = parseFloat(lngMeta);
    if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    return { lat: -29.8587, lng: 31.0218 };
  })();

  function initMapIfAvailable(){
    if (!window.google || !google.maps) return; // library not loaded yet
    const mapEl = document.getElementById('map');
    if (!mapEl) return;
    geocoder = new google.maps.Geocoder();
    distanceService = new google.maps.DistanceMatrixService();
    map = new google.maps.Map(mapEl, { center: origin, zoom: 12 });
    marker = new google.maps.Marker({ map, position: origin, title: 'Legends Rooftop' });

    const input = document.getElementById('address-search');
    if (input) {
      autocomplete = new google.maps.places.Autocomplete(input, { fields: ['place_id','geometry','formatted_address','address_components'] });
      autocomplete.addListener('place_changed', ()=>{
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.place_id) { toast('Please select a suggested address from Google','error'); return; }
        const loc = place.geometry.location;
        marker.setPosition(loc);
        map.panTo(loc);
        map.setZoom(14);
        fillAddressFromComponents(place.address_components, place.formatted_address);
        computeDistanceFromCoords(loc.lat(), loc.lng());
      });
    }

    const useBtn = document.getElementById('use-location');
    if (useBtn) {
      useBtn.addEventListener('click', ()=>{
        if (!navigator.geolocation) { toast('Geolocation is not supported','error'); return; }
        navigator.geolocation.getCurrentPosition(pos=>{
          const { latitude, longitude } = pos.coords;
          const latLng = new google.maps.LatLng(latitude, longitude);
          marker.setPosition(latLng);
          map.panTo(latLng);
          map.setZoom(14);
          // Reverse geocode to fill address
          geocoder.geocode({ location: latLng }, (results, status)=>{
            if (status === 'OK' && results && results[0]) {
              fillAddressFromComponents(results[0].address_components, results[0].formatted_address);
            }
          });
          computeDistanceFromCoords(latitude, longitude);
        }, ()=> toast('Could not fetch location','error'));
      });
    }
  }
  // Expose for async loader to call once Google Maps finishes loading
  window.initMapIfAvailable = initMapIfAvailable;

  function fillAddressFromComponents(components, formatted){
    const byType = (t)=> components.find(c=> c.types && c.types.includes(t))?.long_name || '';
    const streetNumber = byType('street_number');
    const route = byType('route');
    const suburb = byType('sublocality_level_1') || byType('sublocality') || byType('neighborhood');
    const city = byType('locality') || byType('administrative_area_level_2');
    const postal = byType('postal_code');
    const streetField = document.getElementById('street');
    const suburbField = document.getElementById('suburb');
    const cityField = document.getElementById('city');
    const postalField = document.getElementById('postal-code');
    if (streetField) streetField.value = [streetNumber, route].filter(Boolean).join(' ') || formatted || streetField.value;
    if (suburbField && suburb) suburbField.value = suburb;
    if (cityField && city) cityField.value = city;
    if (postalField && postal) postalField.value = postal;
  }

  function computeDistanceFromCoords(lat, lng){
    if (!distanceService) return;
    distanceService.getDistanceMatrix({
      origins: [origin],
      destinations: [{ lat, lng }],
      travelMode: google.maps.TravelMode.DRIVING,
      unitSystem: google.maps.UnitSystem.METRIC,
    }, (res, status)=>{
      if (status !== 'OK') {
        // Fallback to straight-line approximation if service returns error
        const kmApprox = haversineKm(origin.lat, origin.lng, lat, lng);
        const input = document.getElementById('distance-km');
        if (input) input.value = kmApprox.toFixed(2);
        const ms = document.getElementById('maps-status');
        if (ms) ms.textContent = 'Using approximate distance (road data unavailable).';
        render();
        return;
      }
      const row = res.rows?.[0]?.elements?.[0];
      if (row && row.distance && row.status === 'OK') {
        const km = row.distance.value / 1000;
        const input = document.getElementById('distance-km');
        if (input) input.value = km.toFixed(2);
        render();
      } else {
        // Distance not available: fallback to haversine
        const kmApprox = haversineKm(origin.lat, origin.lng, lat, lng);
        const input = document.getElementById('distance-km');
        if (input) input.value = kmApprox.toFixed(2);
        const ms = document.getElementById('maps-status');
        if (ms) ms.textContent = 'Using approximate distance (no route returned).';
        render();
      }
    });
  }

  // Haversine fallback for approximate distance when Distance Matrix fails
  function haversineKm(lat1, lon1, lat2, lon2){
    const toRad = (d)=> d*Math.PI/180;
    const R = 6371; // km
    const dLat = toRad(lat2-lat1);
    const dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2);
    const c = 2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R*c;
  }

  form.addEventListener('submit', async function(e){
    e.preventDefault();
    // Require at least one item in cart
    const cartBefore = getCart();
    if (!cartBefore || cartBefore.length === 0) { toast('Your cart is empty. Please add items first.','error'); return; }
    // Basic anti-bot check
    const hp = document.getElementById('hp_field');
    const human = document.getElementById('captcha-check');
    if (hp && hp.value) { toast('Bot detected. Submission blocked.','error'); return; }
    if (!human || !human.checked) { toast('Please confirm you are human','error'); return; }
    // reCAPTCHA validation: supports v2 widget and v3 token via meta configuration
    const recaptchaSiteKey = document.querySelector('meta[name="recaptcha-sitekey"]')?.content || '';
    const recaptchaVersion = (document.querySelector('meta[name="recaptcha-version"]')?.content || 'v2').toLowerCase();
    const recaptchaWidget = document.getElementById('recaptcha-container') || document.querySelector('.g-recaptcha');
    let recaptchaToken = '';
    try {
      if (typeof grecaptcha !== 'undefined') {
        if (recaptchaVersion === 'v3' && recaptchaSiteKey) {
          // v3: wait until grecaptcha is ready, then execute
          await new Promise(function(resolve){ try { grecaptcha.ready(resolve); } catch(_) { resolve(); } });
          recaptchaToken = await grecaptcha.execute(recaptchaSiteKey, { action: 'checkout' }).catch(()=> '');
        } else if (recaptchaWidget) {
          // v2: read widget response
          recaptchaToken = grecaptcha.getResponse();
        }
      }
    } catch(_) { /* ignore */ }
    if (recaptchaWidget && recaptchaVersion !== 'v3' && typeof grecaptcha !== 'undefined' && !recaptchaToken) {
      toast('Please complete the reCAPTCHA challenge','error');
      return;
    }
    if (recaptchaVersion === 'v3' && recaptchaSiteKey && typeof grecaptcha !== 'undefined' && !recaptchaToken) {
      toast('reCAPTCHA failed. Please try again.','error');
      return;
    }
    const first=document.getElementById('first-name').value.trim();
    const last=document.getElementById('last-name').value.trim();
    const phone=document.getElementById('phone').value.trim();
    const consentEl=document.getElementById('kyc-consent');
    const street=document.getElementById('street')?.value.trim()||'';
    const suburb=document.getElementById('suburb')?.value.trim()||'';
    const city=document.getElementById('city')?.value.trim()||'';
    const postal=document.getElementById('postal-code')?.value.trim()||'';
    const distVal=document.getElementById('distance-km')?.value.trim()||'';
    const addr=[street, suburb, city, postal].filter(Boolean).join(', ');
    const method=document.querySelector('.payment-method.selected')?.dataset.method||'';
    if(!first||!last){ toast('Please enter your full name','error'); return; }
    // South African mobile number validation
    const saPhoneRegex=/^(\+27|0)[6-8][0-9]{8}$/;
    if(!saPhoneRegex.test(phone)){ toast('Enter a valid South African mobile number','error'); return; }
    if(!consentEl || !consentEl.checked){ toast('Please consent to verification to proceed','error'); return; }
    if(deliveryOption==='delivery'){
      if(!street || !suburb || !city || !postal){ toast('Please fill street, suburb, city and postal code','error'); return; }
    }
    if(!method){ toast('Please select a payment method','error'); return; }
    const cart=getCart();
    const orderNumber='LEG-2025-'+Math.floor(Math.random()*1000).toString().padStart(3,'0');
    const d=calcDelivery();
    const subtotal=cart.reduce((s,i)=>s+i.price*i.quantity,0);
    const t=subtotal+d;
    const lines=cart.map(i=>{
      const extra=[]; if (Array.isArray(i.exclusions) && i.exclusions.length) extra.push(`Excl: ${i.exclusions.join(', ')}`); if (i.notes) extra.push(`Notes: ${i.notes}`);
      const tail = extra.length ? ` (${extra.join(' | ')})` : '';
      return `${i.name} x ${i.quantity} = ${currency(i.price*i.quantity)}${tail}`;
    }).join('\n');
    const text=`Order ${orderNumber}\n${lines}\nOrder type: ${deliveryOption}\nAddress: ${addr || (deliveryOption==='pickup'?'Pickup at store':'')}${distVal?`\nDistance: ${distVal} km`:''}\nDelivery: ${currency(d)}\nTotal: ${currency(t)}`;

    // Update WhatsApp share link
    document.getElementById('share-order').setAttribute('href','https://wa.me/27787348487?text='+encodeURIComponent(text));

    // Populate hidden fields for non-JS fallback
    document.getElementById('order-type-hidden').value = deliveryOption;
    document.getElementById('payment-method').value = method;
    document.getElementById('order-number').value = orderNumber;
    document.getElementById('order-summary').value = text;
    document.getElementById('order-subtotal').value = currency(subtotal);
    document.getElementById('order-delivery').value = currency(d);
    document.getElementById('order-total').value = currency(t);
    const kycHidden=document.getElementById('kyc-consent-hidden');
    if(kycHidden) kycHidden.value = 'true';

    // Send to Formspree interactively
    try {
      const fd = new FormData();
      fd.append('subject','New Legends Rooftop Order');
    // Include reCAPTCHA token (may be empty if unavailable or not enforced)
    fd.append('g-recaptcha-response', recaptchaToken);
      fd.append('firstName', first);
      fd.append('lastName', last);
      fd.append('phone', phone);
      fd.append('address', addr);
      fd.append('street', street);
      fd.append('suburb', suburb);
      fd.append('city', city);
      fd.append('postalCode', postal);
      fd.append('distanceKm', distVal);
      fd.append('orderType', deliveryOption);
      fd.append('paymentMethod', method);
      fd.append('orderNumber', orderNumber);
      fd.append('orderSummary', text);
      fd.append('subtotal', currency(subtotal));
      fd.append('deliveryFee', currency(d));
      fd.append('total', currency(t));
      const resp = await fetch('https://formspree.io/f/mblvglba', { method:'POST', headers:{ 'Accept':'application/json' }, body: fd });
      if (resp.ok) {
        toast('Order submitted. We will contact you shortly.','success');
        try { if (typeof grecaptcha !== 'undefined') grecaptcha.reset(); } catch(_){}
        // Optionally clear cart after success
        try { setCart([]); render(); } catch(_) {}
      } else {
        toast('Could not submit order. Please try again.','error');
      }
    } catch(err){
      toast('Network error submitting order.','error');
    }
  });

  // Initialize maps after DOM ready
  initMapIfAvailable();
  render();
});
