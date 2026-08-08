/* =====================================================================
   Admin order dashboard for Cha.Nechri.
   Open the site and go to #admin to reach it. Requires a Supabase Auth
   account whose email matches the admin email locked into the orders
   RLS policies (see the SQL migrations in the repo root).
   ===================================================================== */

const WHATSAPP_STATUS_OPTIONS = ['nouveau', 'confirmé', 'expédié', 'livré', 'annulé'];

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
  const itemsText = (order.items || [])
    .map(it => `- ${it.name} × ${it.qty} (${fmtDA(it.lineTotal)})`)
    .join('\n');
  return (
    `Bonjour ${order.customer_name}, votre commande *${order.order_no}* chez Cha.Nechri est confirmée ✅\n\n` +
    `${itemsText}\n\n` +
    `Livraison (${order.delivery_type === 'domicile' ? 'Domicile' : 'Bureau'}) : ${fmtDA(order.shipping_fee)}\n` +
    `Total à payer à la livraison : *${fmtDA(order.grand_total)}*\n\n` +
    `Merci pour votre confiance, on vous livre bientôt ! 🌸`
  );
}

function renderLogin(errorMsg) {
  document.getElementById('adminLoginBox').style.display = 'block';
  document.getElementById('adminOrdersSection').style.display = 'none';
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
      <td>${it.name}</td>
      <td>${it.qty}</td>
      <td>${fmtDA(it.unitPrice)}</td>
      <td>${fmtDA(it.lineTotal)}</td>
    </tr>
  `).join('');

  const statusOptions = WHATSAPP_STATUS_OPTIONS.map(s =>
    `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  const card = document.createElement('div');
  card.className = 'admin-order-card';
  card.innerHTML = `
    <div class="admin-order-top">
      <div>
        <div class="admin-order-no">N° ${order.order_no}</div>
        <div class="admin-order-customer">${order.customer_name} — ${order.customer_phone}</div>
        <div class="admin-order-meta">${order.wilaya} · ${order.delivery_type === 'domicile' ? 'Domicile' : 'Bureau'}${order.address ? ' · ' + order.address : ''}</div>
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
  document.getElementById('adminOrdersSection').style.display = 'block';
  document.getElementById('adminLogoutBtn').style.display = 'inline-block';
  await loadOrders();
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
