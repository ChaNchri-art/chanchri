/* =====================================================================
   Admin order dashboard for Cha.Nechri.
   Open the site and go to #admin to reach it. Requires a Supabase Auth
   account whose email matches the admin email locked into the orders
   RLS policies (see the SQL migrations in the repo root).
   ===================================================================== */

const WHATSAPP_STATUS_OPTIONS = ['nouveau', 'confirmé', 'expédié', 'livré', 'annulé'];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

const CONFIRMATION_TEXT = {
  fr: {
    greeting: (name, orderNo) => `Bonjour ${name}, votre commande *${orderNo}* chez Cha.Nechri est confirmée ✅`,
    delivery: 'Livraison',
    domicile: 'Domicile',
    bureau: 'Bureau',
    total: 'Total à payer à la livraison',
    note: 'Remarque',
    thanks: 'Merci pour votre confiance, on vous livre bientôt ! 🌸'
  },
  en: {
    greeting: (name, orderNo) => `Hi ${name}, your order *${orderNo}* from Cha.Nechri is confirmed ✅`,
    delivery: 'Delivery',
    domicile: 'Home delivery',
    bureau: 'Pickup point',
    total: 'Total to pay on delivery',
    note: 'Note',
    thanks: 'Thanks for your order, it will be delivered soon! 🌸'
  },
  ar: {
    greeting: (name, orderNo) => `مرحباً ${name}، تم تأكيد طلبك *${orderNo}* من Cha.Nechri ✅`,
    delivery: 'التوصيل',
    domicile: 'توصيل للمنزل',
    bureau: 'نقطة استلام',
    total: 'المبلغ الإجمالي يُدفع عند التوصيل',
    note: 'ملاحظة',
    thanks: 'شكراً لثقتكم، سيتم التوصيل قريباً! 🌸'
  }
};

function fmtDA(n) {
  return new Intl.NumberFormat('fr-FR').format(n || 0) + ' DA';
}

function toWhatsappNumber(localPhone) {
  // Local format: 0XXXXXXXXX (10 digits) -> international 213XXXXXXXXX
  const digits = (localPhone || '').replace(/\s+/g, '');
  if (digits.startsWith('0')) return '213' + digits.slice(1);
  return digits;
}

function buildConfirmationMessage(order) {
  const lang = CONFIRMATION_TEXT[order.lang] ? order.lang : 'fr';
  const tr = CONFIRMATION_TEXT[lang];
  const itemsText = (order.items || [])
    .map(it => `- ${it.name} × ${it.qty} (${fmtDA(it.lineTotal)})`)
    .join('\n');
  const noteLine = order.note ? `${tr.note} : ${order.note}\n\n` : '';
  return (
    `${tr.greeting(order.customer_name, order.order_no)}\n\n` +
    `${itemsText}\n\n` +
    `${tr.delivery} (${order.delivery_type === 'domicile' ? tr.domicile : tr.bureau}) : ${fmtDA(order.shipping_fee)}\n` +
    `${tr.total} : *${fmtDA(order.grand_total)}*\n\n` +
    `${noteLine}` +
    `${tr.thanks}`
  );
}

function renderLogin(errorMsg) {
  document.getElementById('adminLoginBox').style.display = 'block';
  document.getElementById('adminDashboard').style.display = 'none';
  document.getElementById('adminLogoutBtn').style.display = 'none';
  const errEl = document.getElementById('adminLoginError');
  if (errorMsg) {
    errEl.textContent = errorMsg;
    errEl.style.display = 'block';
  } else {
    errEl.style.display = 'none';
  }
}

function renderOrderCard(order) {
  const itemsRows = (order.items || []).map(it => `
    <tr>
      <td>${escapeHtml(it.name)}</td>
      <td>${escapeHtml(it.qty)}</td>
      <td>${fmtDA(it.unitPrice)}</td>
      <td>${fmtDA(it.lineTotal)}</td>
    </tr>
  `).join('');

  const statusOptions = WHATSAPP_STATUS_OPTIONS.map(s =>
    `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  const noteBlock = order.note
    ? `<div class="admin-order-note"><b>Remarque :</b> ${escapeHtml(order.note)}</div>`
    : '';

  const card = document.createElement('div');
  card.className = 'admin-order-card';
  card.innerHTML = `
    <div class="admin-order-top">
      <div>
        <div class="admin-order-no">N° ${escapeHtml(order.order_no)}</div>
        <div class="admin-order-customer">${escapeHtml(order.customer_name)} — ${escapeHtml(order.customer_phone)}</div>
        <div class="admin-order-meta">${escapeHtml(order.wilaya)} · ${order.delivery_type === 'domicile' ? 'Domicile' : 'Bureau'}${order.address ? ' · ' + escapeHtml(order.address) : ''} · ${escapeHtml((order.lang || 'fr').toUpperCase())}</div>
        ${noteBlock}
      </div>
      <div class="admin-order-date">${new Date(order.created_at).toLocaleString('fr-FR')}</div>
    </div>

    <table class="admin-items-table">
      <thead><tr><th>Article</th><th>Qté</th><th>Prix</th><th>Total</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="admin-order-totals">
      Sous-total ${fmtDA(order.items_total)} + Livraison ${fmtDA(order.shipping_fee)} =
      <b>${fmtDA(order.grand_total)}</b>
    </div>

    <div class="admin-order-actions">
      <button class="admin-btn admin-btn-whatsapp" data-action="whatsapp">Envoyer confirmation WhatsApp</button>
      <select class="admin-status-select" data-action="status">${statusOptions}</select>
      <button class="admin-btn admin-btn-danger" data-action="delete">Supprimer</button>
    </div>
  `;

  card.querySelector('[data-action="whatsapp"]').addEventListener('click', () => {
    const num = toWhatsappNumber(order.customer_phone);
    const msg = encodeURIComponent(buildConfirmationMessage(order));
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
  });

  card.querySelector('[data-action="status"]').addEventListener('change', async (e) => {
    const newStatus = e.target.value;
    const { error } = await window.sb.from('orders').update({ status: newStatus }).eq('id', order.id);
    if (error) alert('Erreur mise à jour statut: ' + error.message);
  });

  card.querySelector('[data-action="delete"]').addEventListener('click', async () => {
    if (!confirm(`Supprimer la commande ${order.order_no} ?`)) return;
    const { error } = await window.sb.from('orders').delete().eq('id', order.id);
    if (error) { alert('Erreur suppression: ' + error.message); return; }
    card.remove();
  });

  return card;
}

async function loadOrders() {
  const listEl = document.getElementById('adminOrdersList');
  listEl.innerHTML = '<div class="admin-empty">Chargement…</div>';

  const { data, error } = await window.sb
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    listEl.innerHTML = `<div class="admin-empty">Erreur de chargement: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    listEl.innerHTML = '<div class="admin-empty">Aucune commande pour le moment.</div>';
    return;
  }

  listEl.innerHTML = '';
  data.forEach(order => listEl.appendChild(renderOrderCard(order)));
}

async function renderDashboard() {
  document.getElementById('adminLoginBox').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';
  document.getElementById('adminLogoutBtn').style.display = 'inline-block';
  await loadOrders();
}

/* ===================================================================
   Products tab
   =================================================================== */

const PRODUCT_CATEGORIES = {
  sacs:   'Sacs & Bagages',
  camping:'Camping & Outdoor',
  decor:  'Décoration',
  maison: 'Maison & Cuisine',
  jouets: 'Jouets & Enfants',
  auto:   'Auto & Moto',
  tech:   'High-Tech & Gadgets',
  sport:  'Sport & Fitness',
  sante:  'Beauté & Santé',
  outils: 'Outillage & Bricolage',
  divers: 'Divers'
};

let allProducts = [];
let productsPage = 1;
const PRODUCTS_PER_PAGE = 25;

function fmtDA2(n) {
  return new Intl.NumberFormat('fr-FR').format(n || 0) + ' DA';
}

function populateCategorySelects() {
  const filterSel = document.getElementById('prodCategoryFilter');
  const formSel = document.getElementById('prodCategory');
  const opts = Object.entries(PRODUCT_CATEGORIES)
    .map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
  if (filterSel && filterSel.children.length <= 1) {
    filterSel.insertAdjacentHTML('beforeend', opts);
  }
  if (formSel) formSel.innerHTML = opts;
}

function renderProductStats() {
  const total = allProducts.length;
  const outOfStock = allProducts.filter(p => p.stock !== null && p.stock === 0).length;
  const lowStock = allProducts.filter(p => p.stock !== null && p.stock > 0 && p.stock <= 5).length;
  const inactive = allProducts.filter(p => !p.active).length;

  const statsEl = document.getElementById('adminProductStats');
  statsEl.innerHTML = `
    <div class="admin-stat-card"><div class="admin-stat-label">Total produits</div><div class="admin-stat-value">${total}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">Stock faible</div><div class="admin-stat-value warn">${lowStock}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">Rupture de stock</div><div class="admin-stat-value danger">${outOfStock}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">Inactifs</div><div class="admin-stat-value">${inactive}</div></div>
  `;
}

function stockBadge(stock) {
  if (stock === null || stock === undefined) return `<span class="admin-badge admin-badge-ok">Illimité</span>`;
  if (stock === 0) return `<span class="admin-badge admin-badge-danger">Rupture</span>`;
  if (stock <= 5) return `<span class="admin-badge admin-badge-warn">Faible (${stock})</span>`;
  return `<span class="admin-badge admin-badge-ok">${stock} en stock</span>`;
}

function getFilteredProducts() {
  const search = (document.getElementById('prodSearchInput').value || '').trim().toLowerCase();
  const cat = document.getElementById('prodCategoryFilter').value;
  const stockFilter = document.getElementById('prodStockFilter').value;
  const sort = document.getElementById('prodSortSelect').value;

  let list = allProducts.filter(p => {
    if (search) {
      const hay = `${p.name_fr || ''} ${p.name_en || ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    if (cat && p.category_id !== cat) return false;
    if (stockFilter === 'in' && !(p.stock === null || p.stock > 5)) return false;
    if (stockFilter === 'low' && !(p.stock !== null && p.stock > 0 && p.stock <= 5)) return false;
    if (stockFilter === 'out' && p.stock !== 0) return false;
    return true;
  });

  if (sort === 'sold-desc') list = list.slice().sort((a, b) => (b.units_sold || 0) - (a.units_sold || 0));
  else if (sort === 'clicks-desc') list = list.slice().sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
  else if (sort === 'rating-desc') list = list.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
  else if (sort === 'price-asc') list = list.slice().sort((a, b) => a.base_price - b.base_price);
  else if (sort === 'price-desc') list = list.slice().sort((a, b) => b.base_price - a.base_price);

  return list;
}

function renderProductsTable() {
  const filtered = getFilteredProducts();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PRODUCTS_PER_PAGE));
  if (productsPage > totalPages) productsPage = totalPages;
  const start = (productsPage - 1) * PRODUCTS_PER_PAGE;
  const pageItems = filtered.slice(start, start + PRODUCTS_PER_PAGE);

  const tbody = document.getElementById('adminProductsTableBody');
  if (!pageItems.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:var(--ink-soft);">Aucun produit trouvé.</td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map(p => `
      <tr data-id="${escapeHtml(p.id)}">
        <td>
          <div class="admin-prod-name-cell">
            <img class="admin-prod-thumb" src="${escapeHtml(p.image || '')}" onerror="this.style.visibility='hidden'">
            <span class="admin-prod-name-text" title="${escapeHtml(p.name_fr)}">${escapeHtml(p.name_fr || '(sans nom)')}</span>
          </div>
        </td>
        <td>${escapeHtml(PRODUCT_CATEGORIES[p.category_id] || p.category_id || '')}</td>
        <td>${fmtDA2(p.base_price)}</td>
        <td>${stockBadge(p.stock)}</td>
        <td>${p.units_sold || 0}</td>
        <td>${p.clicks || 0}</td>
        <td>${p.rating ? '★ ' + Number(p.rating).toFixed(1) : '—'}</td>
        <td>${p.active ? '<span class="admin-badge admin-badge-ok">Actif</span>' : '<span class="admin-badge admin-badge-danger">Inactif</span>'}</td>
        <td>
          <div class="admin-row-actions">
            <button data-action="edit" title="Modifier">✎</button>
            <button data-action="delete" title="Supprimer">🗑</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr').forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-action="edit"]').addEventListener('click', () => openProductForm(id));
      row.querySelector('[data-action="delete"]').addEventListener('click', () => deleteProduct(id));
    });
  }

  const pag = document.getElementById('adminProductsPagination');
  if (totalPages <= 1) {
    pag.innerHTML = '';
  } else {
    let html = `<button ${productsPage === 1 ? 'disabled' : ''} data-page="${productsPage - 1}">‹</button>`;
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === productsPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }
    html += `<button ${productsPage === totalPages ? 'disabled' : ''} data-page="${productsPage + 1}">›</button>`;
    pag.innerHTML = html;
    pag.querySelectorAll('button[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        productsPage = parseInt(btn.dataset.page, 10);
        renderProductsTable();
      });
    });
  }
}

async function loadProducts() {
  const tbody = document.getElementById('adminProductsTableBody');
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">Chargement…</td></tr>`;

  const { data, error } = await window.sb
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px;">Erreur: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }

  // units_sold, clicks, and rating are maintained directly on the products
  // row (units_sold via a DB trigger on orders, clicks via the
  // increment_product_click RPC) — no extra aggregation needed here.
  allProducts = data || [];
  productsPage = 1;
  renderProductStats();
  renderProductsTable();
}

function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || ('produit-' + Date.now());
}

function openProductForm(id) {
  const overlay = document.getElementById('prodModalOverlay');
  const title = document.getElementById('prodModalTitle');
  const errEl = document.getElementById('prodModalError');
  errEl.style.display = 'none';
  document.getElementById('prodForm').reset();

  if (id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    title.textContent = 'Modifier le produit';
    document.getElementById('prodFormId').value = p.id;
    document.getElementById('prodNameFr').value = p.name_fr || '';
    document.getElementById('prodNameEn').value = p.name_en || '';
    document.getElementById('prodNameAr').value = p.name_ar || '';
    document.getElementById('prodCategory').value = p.category_id || 'divers';
    document.getElementById('prodPrice').value = p.base_price || 0;
    document.getElementById('prodStock').value = p.stock === null || p.stock === undefined ? '' : p.stock;
    document.getElementById('prodRating').value = p.rating ? p.rating : '';
    document.getElementById('prodActive').value = p.active ? 'true' : 'false';
    const imgs = Array.isArray(p.images) && p.images.length ? p.images : (p.image ? [p.image] : []);
    document.getElementById('prodImages').value = imgs.join('\n');
    document.getElementById('prodTaglineFr').value = p.tagline_fr || '';
    document.getElementById('prodDescFr').value = p.description_fr || '';
  } else {
    title.textContent = 'Ajouter un produit';
    document.getElementById('prodFormId').value = '';
    document.getElementById('prodActive').value = 'true';
  }

  overlay.classList.add('open');
}

function closeProductForm() {
  document.getElementById('prodModalOverlay').classList.remove('open');
}

async function saveProduct(e) {
  e.preventDefault();
  const errEl = document.getElementById('prodModalError');
  errEl.style.display = 'none';

  const existingId = document.getElementById('prodFormId').value;
  const nameFr = document.getElementById('prodNameFr').value.trim();
  if (!nameFr) return;

  const imagesList = document.getElementById('prodImages').value
    .split('\n').map(s => s.trim()).filter(Boolean);
  const descFr = document.getElementById('prodDescFr').value.trim();
  if (!imagesList.length) {
    errEl.textContent = 'Ajoutez au moins une image.';
    errEl.style.display = 'block';
    return;
  }
  if (!descFr) {
    errEl.textContent = 'La description est obligatoire.';
    errEl.style.display = 'block';
    return;
  }

  const ratingRaw = document.getElementById('prodRating').value;
  const stockRaw = document.getElementById('prodStock').value;
  const record = {
    category_id: document.getElementById('prodCategory').value,
    base_price: parseInt(document.getElementById('prodPrice').value, 10) || 0,
    stock: stockRaw === '' ? null : parseInt(stockRaw, 10),
    active: document.getElementById('prodActive').value === 'true',
    image: imagesList[0],
    images: imagesList,
    name_fr: nameFr,
    name_en: document.getElementById('prodNameEn').value.trim() || nameFr,
    name_ar: document.getElementById('prodNameAr').value.trim() || nameFr,
    tagline_fr: document.getElementById('prodTaglineFr').value.trim(),
    tagline_en: document.getElementById('prodTaglineFr').value.trim(),
    tagline_ar: document.getElementById('prodTaglineFr').value.trim(),
    description_fr: descFr,
    description_en: descFr,
    description_ar: descFr,
    source: 'manual'
  };
  // rating is NOT NULL in the DB (default 0) — only include it when the
  // admin actually typed a value, otherwise leave the column untouched/default.
  if (ratingRaw !== '') record.rating = parseFloat(ratingRaw);

  const saveBtn = document.getElementById('prodSaveBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Enregistrement…';

  let error;
  if (existingId) {
    ({ error } = await window.sb.from('products').update(record).eq('id', existingId));
  } else {
    record.id = slugify(nameFr) + '-' + Math.random().toString(36).slice(2, 7);
    ({ error } = await window.sb.from('products').insert(record));
  }

  saveBtn.disabled = false;
  saveBtn.textContent = 'Enregistrer';

  if (error) {
    errEl.textContent = 'Erreur: ' + error.message;
    errEl.style.display = 'block';
    return;
  }

  closeProductForm();
  await loadProducts();
}

async function deleteProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`Supprimer "${p.name_fr}" ? Cette action est définitive.`)) return;
  const { error } = await window.sb.from('products').delete().eq('id', id);
  if (error) { alert('Erreur suppression: ' + error.message); return; }
  await loadProducts();
}

function initProductsTab() {
  populateCategorySelects();

  document.getElementById('prodAddBtn').addEventListener('click', () => openProductForm(null));
  document.getElementById('prodCancelBtn').addEventListener('click', closeProductForm);
  document.getElementById('prodModalOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'prodModalOverlay') closeProductForm();
  });
  document.getElementById('prodForm').addEventListener('submit', saveProduct);

  document.getElementById('prodSearchInput').addEventListener('input', () => { productsPage = 1; renderProductsTable(); });
  document.getElementById('prodCategoryFilter').addEventListener('change', () => { productsPage = 1; renderProductsTable(); });
  document.getElementById('prodStockFilter').addEventListener('change', () => { productsPage = 1; renderProductsTable(); });
  document.getElementById('prodSortSelect').addEventListener('change', () => { productsPage = 1; renderProductsTable(); });
}

/* ===================================================================
   Visits tab
   =================================================================== */

async function loadVisits() {
  const statsEl = document.getElementById('adminVisitsStats');
  const chartEl = document.getElementById('adminVisitsChart');
  const topEl = document.getElementById('adminTopProducts');
  statsEl.innerHTML = `<div class="admin-stat-card"><div class="admin-stat-label">Chargement…</div></div>`;
  chartEl.innerHTML = '';
  topEl.innerHTML = '';

  const [visitsRes, productsRes] = await Promise.all([
    window.sb.from('visits').select('visitor_key, created_at'),
    window.sb.from('products').select('id, name_fr, clicks').order('clicks', { ascending: false }).limit(8)
  ]);

  if (visitsRes.error) {
    statsEl.innerHTML = `<div class="admin-stat-card"><div class="admin-stat-label">Erreur: ${escapeHtml(visitsRes.error.message)}</div></div>`;
    return;
  }

  const visits = visitsRes.data || [];
  const topProducts = productsRes.data || [];
  const totalClicks = topProducts.reduce((sum, p) => sum + (p.clicks || 0), 0);

  const now = new Date();
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = startOfDay(now);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);
  const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 29);

  const uniqueVisitors = new Set(visits.map(v => v.visitor_key)).size;
  const todayCount = visits.filter(v => new Date(v.created_at) >= today).length;
  const weekCount = visits.filter(v => new Date(v.created_at) >= weekAgo).length;
  const monthCount = visits.filter(v => new Date(v.created_at) >= monthAgo).length;

  statsEl.innerHTML = `
    <div class="admin-stat-card"><div class="admin-stat-label">Visites totales</div><div class="admin-stat-value">${visits.length}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">Visiteurs uniques</div><div class="admin-stat-value">${uniqueVisitors}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">Aujourd'hui</div><div class="admin-stat-value">${todayCount}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">7 derniers jours</div><div class="admin-stat-value">${weekCount}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">30 derniers jours</div><div class="admin-stat-value">${monthCount}</div></div>
    <div class="admin-stat-card"><div class="admin-stat-label">Vues produits (top 8)</div><div class="admin-stat-value">${totalClicks}</div></div>
  `;

  // Last 14 days bar chart
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    days.push(d);
  }
  const dayCounts = days.map(d => {
    const next = new Date(d); next.setDate(next.getDate() + 1);
    return visits.filter(v => { const t = new Date(v.created_at); return t >= d && t < next; }).length;
  });
  const maxCount = Math.max(1, ...dayCounts);
  chartEl.innerHTML = days.map((d, i) => `
    <div class="visit-bar-row">
      <div class="visit-bar-label">${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</div>
      <div class="visit-bar-track"><div class="visit-bar-fill" style="width:${(dayCounts[i] / maxCount) * 100}%;"></div></div>
      <div class="visit-bar-count">${dayCounts[i]}</div>
    </div>
  `).join('');

  // Top viewed products (products.clicks, maintained by the
  // increment_product_click RPC called from the storefront)
  const withClicks = topProducts.filter(p => (p.clicks || 0) > 0);
  if (!withClicks.length) {
    topEl.innerHTML = `<div style="color:var(--ink-soft); font-size:12.5px;">Pas encore de données de consultation.</div>`;
  } else {
    topEl.innerHTML = withClicks.map(p => `
      <div class="top-prod-row">
        <span class="top-prod-name">${escapeHtml(p.name_fr || p.id)}</span>
        <span class="top-prod-count">${p.clicks}</span>
      </div>
    `).join('');
  }
}

function initAdminTabs() {
  const tabs = [
    { btn: 'adminTabOrdersBtn', section: 'adminOrdersSection', onShow: null },
    { btn: 'adminTabProductsBtn', section: 'adminProductsSection', onShow: () => loadProducts() },
    { btn: 'adminTabVisitsBtn', section: 'adminVisitsSection', onShow: () => loadVisits() }
  ];

  tabs.forEach(tab => {
    document.getElementById(tab.btn).addEventListener('click', () => {
      tabs.forEach(t => {
        document.getElementById(t.btn).classList.toggle('active', t.btn === tab.btn);
        document.getElementById(t.section).style.display = t.btn === tab.btn ? 'block' : 'none';
      });
      if (tab.onShow) tab.onShow();
    });
  });
}

async function checkAuthAndRender() {
  if (!window.sb) {
    renderLogin('Supabase non initialisé.');
    return;
  }
  const { data: { session } } = await window.sb.auth.getSession();
  if (session) {
    renderDashboard();
  } else {
    renderLogin();
  }
}

function setAdminMode(isAdmin) {
  document.body.classList.toggle('admin-mode', isAdmin);
  if (isAdmin) checkAuthAndRender();
}

function initAdmin() {
  setAdminMode(location.hash === '#admin');
  window.addEventListener('hashchange', () => {
    setAdminMode(location.hash === '#admin');
  });

  initAdminTabs();
  initProductsTab();

  const loginBtn = document.getElementById('adminLoginBtn');
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email = document.getElementById('adminEmail').value.trim();
      const password = document.getElementById('adminPassword').value;
      if (!email || !password) return;
      loginBtn.disabled = true;
      loginBtn.textContent = 'Connexion…';
      const { error } = await window.sb.auth.signInWithPassword({ email, password });
      loginBtn.disabled = false;
      loginBtn.textContent = 'Se connecter';
      if (error) {
        renderLogin('Identifiants incorrects.');
        return;
      }
      renderDashboard();
    });
  }

  const logoutBtn = document.getElementById('adminLogoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await window.sb.auth.signOut();
      renderLogin();
    });
  }

  if (window.sb) {
    window.sb.auth.onAuthStateChange((_event, session) => {
      if (location.hash !== '#admin') return;
      if (session) renderDashboard();
      else renderLogin();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}
