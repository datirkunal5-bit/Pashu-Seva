import { t, getLang, setLang, formatCurrency, formatDate } from './i18n.js';
import { api, authStorage } from './api.js';

// Application State
const state = {
  activePortal: 'admin', // 'admin' | 'member'
  currentScreen: 'dashboard', // 'dashboard' | 'ledger' | 'login'
  adminUser: authStorage.getAdminUser(),
  memberUser: authStorage.getMemberUser(),
  selectedMemberId: null,
  selectedMemberData: null,
  members: [],
  dashboardStats: null,
  memberHomeData: null,
  pendingTxToEdit: null,
  pendingTxToDelete: null,
  tempPhoneNumber: '',
  tempOtpCode: ''
};

// UI Element Cache
const dom = {
  langToggleBtn: document.getElementById('langToggleBtn'),
  brandSub: document.getElementById('brandSub'),
  portalBadge: document.getElementById('portalBadge'),
  logoutBtn: document.getElementById('logoutBtn'),
  appContent: document.getElementById('appContent'),
  fabAddBtn: document.getElementById('fabAddBtn'),

  // Modals
  addTxModal: document.getElementById('addTxModal'),
  addMemberModal: document.getElementById('addMemberModal'),
  confirmModal: document.getElementById('confirmModal')
};

// ==========================================================================
// Initialization & Global Event Listeners
// ==========================================================================

export function initApp() {
  setupLanguage();
  checkAuthAndRoute();

  // Header language switch
  dom.langToggleBtn.addEventListener('click', () => {
    const newLang = getLang() === 'mr' ? 'en' : 'mr';
    setLang(newLang);
    setupLanguage();
    renderCurrentView();
  });

  // Switch role between Admin and Member
  dom.portalBadge.addEventListener('click', () => {
    state.activePortal = state.activePortal === 'admin' ? 'member' : 'admin';
    checkAuthAndRoute();
  });

  // Logout button
  dom.logoutBtn.addEventListener('click', () => {
    if (state.activePortal === 'admin') {
      authStorage.clearAdmin();
      state.adminUser = null;
    } else {
      authStorage.clearMember();
      state.memberUser = null;
    }
    checkAuthAndRoute();
  });

  // Floating Action Button (+ Add Entry)
  dom.fabAddBtn.addEventListener('click', () => {
    if (state.selectedMemberData) {
      openAddTxModal(state.selectedMemberData.id, state.selectedMemberData.full_name);
    } else if (state.members.length > 0) {
      openAddTxModal(state.members[0].id, state.members[0].full_name);
    }
  });

  // Auto-close modal when clicking backdrop
  document.querySelectorAll('.modal-backdrop').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  });
}

function setupLanguage() {
  document.documentElement.lang = getLang();
  dom.langToggleBtn.textContent = t('langToggle');
  dom.brandSub.textContent = t('societyName');
}

function checkAuthAndRoute() {
  if (state.activePortal === 'admin') {
    dom.portalBadge.textContent = t('adminRole');
    if (authStorage.getAdminToken()) {
      state.adminUser = authStorage.getAdminUser();
      dom.logoutBtn.style.display = 'block';
      renderAdminDashboard();
    } else {
      dom.logoutBtn.style.display = 'none';
      dom.fabAddBtn.style.display = 'none';
      renderAdminLogin();
    }
  } else {
    dom.portalBadge.textContent = t('memberRole');
    if (authStorage.getMemberToken()) {
      state.memberUser = authStorage.getMemberUser();
      dom.logoutBtn.style.display = 'block';
      renderMemberHome();
    } else {
      dom.logoutBtn.style.display = 'none';
      dom.fabAddBtn.style.display = 'none';
      renderMemberLogin();
    }
  }
}

function renderCurrentView() {
  checkAuthAndRoute();
}

// ==========================================================================
// Admin Views: Login, Dashboard, Ledger
// ==========================================================================

function renderAdminLogin() {
  dom.appContent.innerHTML = `
    <div class="auth-container">
      <div class="auth-hero-card">
        <div class="auth-hero-icon">🏛️</div>
        <h2 class="auth-hero-title">${t('societyName')}</h2>
        <div class="auth-hero-sub">${t('appTitle')} - ${t('adminRole')}</div>
      </div>

      <div class="role-tab-container">
        <button class="role-tab-btn active" id="tabAdmin">${t('adminRole')}</button>
        <button class="role-tab-btn" id="tabMember">${t('memberRole')}</button>
      </div>

      <div class="balance-card">
        <h3 style="font-size: 18px; margin-bottom: 14px; font-weight: 700;">क्लार्क लॉगिन (Admin Login)</h3>
        
        <form id="adminLoginForm">
          <div class="form-group">
            <label class="form-label">वापरकर्ता नाव (Username)</label>
            <input type="text" id="adminUser" class="form-input" value="admin" required autofocus />
          </div>

          <div class="form-group">
            <label class="form-label">पासवर्ड (Password)</label>
            <input type="password" id="adminPass" class="form-input" value="admin123" required />
          </div>

          <div id="adminLoginError" style="color: var(--danger); font-size: 13px; margin-bottom: 12px; display: none;"></div>

          <button type="submit" class="btn-primary" id="btnAdminLogin">
            लॉगिन करा (Login)
          </button>
        </form>

        <div class="demo-accounts-box">
          <div class="demo-title">डेमो खाती (Pre-seeded Credentials):</div>
          <div class="demo-pills">
            <span class="demo-pill" id="demoAdminPill">User: admin | Pass: admin123</span>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('tabMember').addEventListener('click', () => {
    state.activePortal = 'member';
    checkAuthAndRoute();
  });

  document.getElementById('demoAdminPill').addEventListener('click', () => {
    document.getElementById('adminUser').value = 'admin';
    document.getElementById('adminPass').value = 'admin123';
  });

  document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const u = document.getElementById('adminUser').value.trim();
    const p = document.getElementById('adminPass').value.trim();
    const btn = document.getElementById('btnAdminLogin');
    const errBox = document.getElementById('adminLoginError');

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;
    errBox.style.display = 'none';

    try {
      await api.adminLogin(u, p);
      checkAuthAndRoute();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'लॉगिन करा (Login)';
    }
  });
}

async function renderAdminDashboard() {
  dom.fabAddBtn.style.display = 'none'; // Only show in ledger or if member selected
  dom.appContent.innerHTML = `<div class="empty-state"><span class="spinner"></span><div class="empty-state-text" style="margin-top: 10px;">${t('loading')}</div></div>`;

  try {
    const [dashData, members] = await Promise.all([
      api.getAdminDashboard(),
      api.getMembers()
    ]);

    state.dashboardStats = dashData;
    state.members = members;

    dom.appContent.innerHTML = `
      <!-- Summary Metrics Grid -->
      <div class="stat-cards-grid">
        <div class="stat-card dues">
          <div class="stat-card-label">${t('totalOutstandingDues')}</div>
          <div class="stat-card-value">${formatCurrency(dashData.totalOutstandingDues)}</div>
        </div>

        <div class="stat-card credit">
          <div class="stat-card-label">${t('totalAdvanceCredits')}</div>
          <div class="stat-card-value">${formatCurrency(dashData.totalAdvanceCredits)}</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-label">${t('totalMembers')}</div>
          <div class="stat-card-value">${dashData.totalMembers}</div>
        </div>

        <div class="stat-card" style="cursor: pointer;" id="btnOpenNewMember">
          <div class="stat-card-label">${t('actions')}</div>
          <div class="stat-card-value" style="font-size: 15px; color: var(--primary-light);">
            ${t('addNewMember')}
          </div>
        </div>
      </div>

      <!-- Search & Filter Header -->
      <div class="section-header">
        <div class="section-title">
          <span>👥</span> ${t('memberList')} (${members.length})
        </div>
      </div>

      <div class="search-bar-container">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input type="text" id="memberSearchInput" class="search-input" placeholder="${t('search')}" />
        </div>
        <select id="memberSortSelect" class="sort-select">
          <option value="balance_desc">${t('sortBalanceDesc')}</option>
          <option value="balance_asc">${t('sortBalanceAsc')}</option>
          <option value="name_asc">${t('sortName')}</option>
          <option value="code_asc">${t('sortCode')}</option>
        </select>
      </div>

      <!-- Member List Container -->
      <div class="members-list" id="memberListContainer">
        ${renderMemberListHtml(members)}
      </div>
    `;

    // Event Handlers
    document.getElementById('btnOpenNewMember').addEventListener('click', openAddMemberModal);

    const searchInput = document.getElementById('memberSearchInput');
    const sortSelect = document.getElementById('memberSortSelect');

    const handleFilter = async () => {
      const q = searchInput.value;
      const s = sortSelect.value;
      try {
        const filtered = await api.getMembers(q, s);
        state.members = filtered;
        document.getElementById('memberListContainer').innerHTML = renderMemberListHtml(filtered);
        attachMemberListEvents();
      } catch (e) {
        console.error(e);
      }
    };

    searchInput.addEventListener('input', debounce(handleFilter, 250));
    sortSelect.addEventListener('change', handleFilter);

    attachMemberListEvents();

  } catch (err) {
    dom.appContent.innerHTML = `
      <div class="alert-box alert-danger">
        ${err.message}
      </div>
      <button class="btn-primary" onclick="window.location.reload()">${t('confirm')}</button>
    `;
  }
}

function renderMemberListHtml(members) {
  if (!members || members.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">${t('noMembersFound')}</div>
      </div>
    `;
  }

  return members.map(m => {
    const bal = m.current_balance;
    const isOwe = bal > 0;
    const isCredit = bal < 0;
    const statusClass = isOwe ? 'owe' : isCredit ? 'credit' : 'settled';
    const label = isOwe ? t('memberOwes') : isCredit ? t('memberCredit') : t('memberSettled');

    return `
      <div class="member-item-card" data-member-id="${m.id}">
        <div class="member-avatar">
          ${m.member_code ? `#${m.member_code}` : m.full_name.charAt(0)}
        </div>
        <div class="member-meta">
          <div class="member-row-name">${m.full_name}</div>
          <div class="member-row-details">
            <span>📞 ${m.phone_number}</span>
            ${m.village ? `<span>• 📍 ${m.village}</span>` : ''}
          </div>
        </div>
        <div class="member-balance-preview">
          <div class="balance-num-preview ${statusClass}">
            ${formatCurrency(bal)}
          </div>
          <div class="balance-label-preview ${statusClass}">${label}</div>
        </div>
      </div>
    `;
  }).join('');
}

function attachMemberListEvents() {
  document.querySelectorAll('.member-item-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-member-id');
      renderAdminMemberLedger(id);
    });
  });
}

/**
 * Member Ledger View for Admin (with Floating "+ Add Entry" & Edit/Delete)
 */
async function renderAdminMemberLedger(memberId) {
  state.selectedMemberId = memberId;
  dom.appContent.innerHTML = `<div class="empty-state"><span class="spinner"></span><div class="empty-state-text" style="margin-top: 10px;">${t('loading')}</div></div>`;

  try {
    const data = await api.getMemberLedger(memberId);
    state.selectedMemberData = data.member;

    const m = data.member;
    const txs = data.transactions;
    const bal = m.current_balance;
    const isOwe = bal > 0;
    const isCredit = bal < 0;
    const statusClass = isOwe ? 'owe' : isCredit ? 'credit' : 'settled';
    const statusLabel = isOwe ? t('youOwe') : isCredit ? t('youAreInCredit') : t('accountSettled');

    // Show floating "+ Add Entry" button
    dom.fabAddBtn.style.display = 'flex';
    dom.fabAddBtn.innerHTML = `<span>➕</span> ${t('addTransaction')}`;

    dom.appContent.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
        <button id="btnBackToMembers" class="btn-secondary" style="width: auto; padding: 6px 12px; font-size: 13px;">
          ← ${t('back')} (${t('memberList')})
        </button>
        <button id="btnQuickEntryTop" class="btn-primary" style="width: auto; padding: 6px 14px; font-size: 13px;">
          ➕ ${t('addTransaction')}
        </button>
      </div>

      <!-- Member Balance Card -->
      <div class="balance-card ${statusClass}">
        <div class="member-header-info">
          <div>
            <div class="member-name-lg">${m.full_name}</div>
            <div class="member-row-details" style="margin-top: 2px;">
              <span>📞 ${m.phone_number}</span>
              ${m.village ? `<span>• 📍 ${m.village}</span>` : ''}
            </div>
          </div>
          ${m.member_code ? `<div class="member-code-tag">खाते क्र. ${m.member_code}</div>` : ''}
        </div>

        <div class="balance-status-badge">
          <span>${isOwe ? '⚠️' : isCredit ? '✅' : '🤝'}</span>
          <span>${statusLabel}</span>
        </div>
        <div class="balance-figure">${formatCurrency(bal)}</div>
        <div class="balance-helper">${t('entryNotice')}</div>
      </div>

      <!-- Ledger Timeline -->
      <div class="section-header">
        <div class="section-title">
          <span>📖</span> ${t('transactionsHistory')} (${txs.length})
        </div>
      </div>

      <div class="tx-timeline-list" id="txList">
        ${renderTransactionListHtml(txs, true)}
      </div>
    `;

    document.getElementById('btnBackToMembers').addEventListener('click', () => {
      state.selectedMemberId = null;
      state.selectedMemberData = null;
      dom.fabAddBtn.style.display = 'none';
      renderAdminDashboard();
    });

    document.getElementById('btnQuickEntryTop').addEventListener('click', () => {
      openAddTxModal(m.id, m.full_name);
    });

    attachTransactionActionEvents(txs);

  } catch (err) {
    dom.appContent.innerHTML = `
      <div class="alert-box alert-danger">${err.message}</div>
      <button class="btn-secondary" id="errBack">${t('back')}</button>
    `;
    document.getElementById('errBack')?.addEventListener('click', renderAdminDashboard);
  }
}

function renderTransactionListHtml(transactions, isAdmin = false) {
  if (!transactions || transactions.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">${t('noTransactionsYet')}</div>
      </div>
    `;
  }

  return transactions.map(tx => {
    const isFeed = tx.type === 'feed_given';
    const typeLabel = isFeed ? t('feedGivenShort') : t('paymentReceivedShort');
    const badgeClass = isFeed ? 'feed' : 'payment';
    const amountSign = isFeed ? '+' : '-';

    return `
      <div class="tx-item" data-tx-id="${tx.id}">
        <div class="tx-header-row">
          <div class="tx-date-badge">
            <span>📅</span> ${formatDate(tx.date)}
          </div>
          <div class="tx-type-badge ${badgeClass}">
            <span>${isFeed ? '🌾' : '💵'}</span>
            <span>${typeLabel}</span>
          </div>
        </div>

        <div class="tx-body-row">
          <div class="tx-note">${tx.note || (isFeed ? t('chipSugras') : t('chipMilkBill'))}</div>
          <div class="tx-amount ${badgeClass}">${amountSign}${formatCurrency(tx.amount)}</div>
        </div>

        <div class="tx-footer-row">
          <div>
            ${t('resultingBalance')}: <span class="running-balance-tag">${formatCurrency(tx.resulting_balance)}</span>
          </div>

          ${isAdmin ? `
            <div class="tx-action-btns">
              <button class="icon-action-btn edit-tx-btn" data-tx-id="${tx.id}" title="${t('edit')}">✏️</button>
              <button class="icon-action-btn del delete-tx-btn" data-tx-id="${tx.id}" title="${t('delete')}">🗑️</button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function attachTransactionActionEvents(transactions) {
  document.querySelectorAll('.edit-tx-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-tx-id');
      const tx = transactions.find(t => t.id === id);
      if (tx) openEditTxModal(tx);
    });
  });

  document.querySelectorAll('.delete-tx-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-tx-id');
      const tx = transactions.find(t => t.id === id);
      if (tx) openDeleteConfirmModal(tx);
    });
  });
}

// ==========================================================================
// Member Views: OTP Login, Registration, Dashboard, Own Ledger
// ==========================================================================

function renderMemberLogin() {
  dom.appContent.innerHTML = `
    <div class="auth-container">
      <div class="auth-hero-card">
        <div class="auth-hero-icon">🐄</div>
        <h2 class="auth-hero-title">${t('societyName')}</h2>
        <div class="auth-hero-sub">${t('appTitle')} - ${t('memberLoginTitle')}</div>
      </div>

      <div class="role-tab-container">
        <button class="role-tab-btn" id="tabAdminFromMember">${t('adminRole')}</button>
        <button class="role-tab-btn active" id="tabMemberActive">${t('memberRole')}</button>
      </div>

      <div class="balance-card" id="memberLoginStep1">
        <h3 style="font-size: 18px; margin-bottom: 6px; font-weight: 700;">${t('memberLoginTitle')}</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">${t('memberLoginSubtitle')}</p>

        <form id="memberSendOtpForm">
          <div class="form-group">
            <label class="form-label">मोबाईल नंबर (10-Digit Mobile)</label>
            <input type="tel" id="memberPhone" class="form-input" placeholder="9876543210" maxlength="10" required autofocus />
          </div>

          <div id="memberOtpSendError" style="color: var(--danger); font-size: 13px; margin-bottom: 12px; display: none;"></div>

          <button type="submit" class="btn-primary" id="btnSendOtp">
            ${t('sendOtpBtn')}
          </button>
        </form>

        <div class="demo-accounts-box">
          <div class="demo-title">चाचणीसाठी उपलब्ध सभासद नंबर (Click to fill):</div>
          <div class="demo-pills">
            <span class="demo-pill" data-phone="9876543210">Ramesh Patil (9876543210)</span>
            <span class="demo-pill" data-phone="9822114455">Sunita Shinde (9822114455)</span>
            <span class="demo-pill" data-phone="9970123456">Tukaram Ghorpade (9970123456)</span>
          </div>
        </div>
      </div>

      <!-- Step 2: OTP Verification (Initially Hidden) -->
      <div class="balance-card" id="memberLoginStep2" style="display: none;">
        <h3 style="font-size: 18px; margin-bottom: 6px; font-weight: 700;">OTP पडताळणी</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;" id="otpSentMsg"></p>

        <div class="alert-box alert-info" id="devOtpBox" style="margin-bottom: 16px; border-left: 4px solid #0284c7; background: #f0f9ff; color: #0369a1; padding: 12px 14px; border-radius: 8px;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px;">📱 चाचणी OTP (Demo Mode)</div>
          <div id="devOtpText" style="font-size: 14px; font-weight: 700; color: #0284c7;"></div>
          <div style="font-size: 11px; margin-top: 6px; color: #64748b; line-height: 1.4;">
            * हा स्थानिक डेमो प्रकल्प असल्याने प्रत्यक्ष सिम कार्डवर SMS पाठवला जात नाही. <br />
            * वरील OTP आपोआप खाली भरला आहे, फक्त खालील <strong>"लॉगिन करा"</strong> बटण दाबा (किंवा <strong>123456</strong> वापरा).
          </div>
        </div>

        <form id="memberVerifyOtpForm">
          <div class="form-group">
            <label class="form-label">${t('enterOtp')}</label>
            <input type="text" id="otpCodeInput" class="form-input" placeholder="123456" maxlength="6" style="font-size: 20px; letter-spacing: 4px; text-align: center;" required />
          </div>

          <div id="memberVerifyError" style="color: var(--danger); font-size: 13px; margin-bottom: 12px; display: none;"></div>

          <button type="submit" class="btn-primary" id="btnVerifyOtp">
            ${t('verifyOtpBtn')}
          </button>

          <button type="button" class="btn-secondary" id="btnBackToPhone" style="margin-top: 10px;">
            ${t('back')}
          </button>
        </form>
      </div>

      <!-- Step 3: Registration if new phone number -->
      <div class="balance-card" id="memberLoginStep3" style="display: none;">
        <h3 style="font-size: 18px; margin-bottom: 6px; font-weight: 700;">${t('memberRegisterTitle')}</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 14px;">तुमचा नंबर पहिल्यांदा वापरला आहे, कृपया नाव नोंदवा.</p>

        <form id="memberSelfRegisterForm">
          <div class="form-group">
            <label class="form-label">${t('fullName')}</label>
            <input type="text" id="regFullName" class="form-input" placeholder="उदा. पांडुरंग मोरे" required />
          </div>

          <div class="form-group">
            <label class="form-label">${t('villageName')}</label>
            <input type="text" id="regVillage" class="form-input" placeholder="उदा. शिरोळी" />
          </div>

          <div class="form-group">
            <label class="form-label">${t('memberCode')}</label>
            <input type="text" id="regCode" class="form-input" placeholder="उदा. 45" />
          </div>

          <div id="regError" style="color: var(--danger); font-size: 13px; margin-bottom: 12px; display: none;"></div>

          <button type="submit" class="btn-primary" id="btnRegisterMember">
            ${t('registerAndLogin')}
          </button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('tabAdminFromMember').addEventListener('click', () => {
    state.activePortal = 'admin';
    checkAuthAndRoute();
  });

  // Demo phone click
  document.querySelectorAll('.demo-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const phone = pill.getAttribute('data-phone');
      document.getElementById('memberPhone').value = phone;
    });
  });

  // Step 1: Send OTP
  document.getElementById('memberSendOtpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = document.getElementById('memberPhone').value.trim();
    const btn = document.getElementById('btnSendOtp');
    const errBox = document.getElementById('memberOtpSendError');

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;
    errBox.style.display = 'none';

    try {
      const res = await api.sendOtp(phone);
      state.tempPhoneNumber = res.phoneNumber;

      document.getElementById('memberLoginStep1').style.display = 'none';
      document.getElementById('memberLoginStep2').style.display = 'block';
      document.getElementById('otpSentMsg').textContent = `+91 ${res.phoneNumber} वर पाठवला`;
      document.getElementById('devOtpText').textContent = `${t('demoOtpNotice')} ${res.devOtp || '123456'}`;
      document.getElementById('otpCodeInput').value = res.devOtp || '123456';
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = t('sendOtpBtn');
    }
  });

  // Back from OTP
  document.getElementById('btnBackToPhone').addEventListener('click', () => {
    document.getElementById('memberLoginStep2').style.display = 'none';
    document.getElementById('memberLoginStep1').style.display = 'block';
    document.getElementById('btnSendOtp').disabled = false;
    document.getElementById('btnSendOtp').textContent = t('sendOtpBtn');
  });

  // Step 2: Verify OTP
  document.getElementById('memberVerifyOtpForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const otp = document.getElementById('otpCodeInput').value.trim();
    const btn = document.getElementById('btnVerifyOtp');
    const errBox = document.getElementById('memberVerifyError');

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;
    errBox.style.display = 'none';

    try {
      const res = await api.verifyOtp(state.tempPhoneNumber, otp);
      if (res.authenticated) {
        checkAuthAndRoute();
      } else if (res.needsRegistration) {
        document.getElementById('memberLoginStep2').style.display = 'none';
        document.getElementById('memberLoginStep3').style.display = 'block';
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = t('verifyOtpBtn');
    }
  });

  // Step 3: Self-Registration
  document.getElementById('memberSelfRegisterForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('regFullName').value.trim();
    const village = document.getElementById('regVillage').value.trim();
    const memberCode = document.getElementById('regCode').value.trim();
    const btn = document.getElementById('btnRegisterMember');
    const errBox = document.getElementById('regError');

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;
    errBox.style.display = 'none';

    try {
      await api.registerMember({
        phoneNumber: state.tempPhoneNumber,
        fullName,
        village,
        memberCode
      });
      checkAuthAndRoute();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = t('registerAndLogin');
    }
  });
}

/**
 * Member Home View (Big Balance Display + Read-Only Ledger)
 */
async function renderMemberHome() {
  dom.fabAddBtn.style.display = 'none'; // Member is read-only
  dom.appContent.innerHTML = `<div class="empty-state"><span class="spinner"></span><div class="empty-state-text" style="margin-top: 10px;">${t('loading')}</div></div>`;

  try {
    const [meData, ledgerTxs] = await Promise.all([
      api.getMemberMe(),
      api.getMemberOwnLedger()
    ]);

    const m = meData.member;
    const summary = meData.summary;
    const lastTx = meData.lastTransaction;
    const bal = m.currentBalance;
    const isOwe = bal > 0;
    const isCredit = bal < 0;
    const statusClass = isOwe ? 'owe' : isCredit ? 'credit' : 'settled';
    const statusLabel = isOwe ? t('youOwe') : isCredit ? t('youAreInCredit') : t('accountSettled');

    dom.appContent.innerHTML = `
      <!-- Member Big Balance Card -->
      <div class="balance-card ${statusClass}">
        <div class="member-header-info">
          <div>
            <div class="member-name-lg">${m.fullName}</div>
            <div class="member-row-details" style="margin-top: 2px;">
              <span>📞 ${m.phoneNumber}</span>
              ${m.village ? `<span>• 📍 ${m.village}</span>` : ''}
            </div>
          </div>
          ${m.memberCode ? `<div class="member-code-tag">खाते क्र. ${m.memberCode}</div>` : ''}
        </div>

        <div class="balance-status-badge">
          <span>${isOwe ? '⚠️' : isCredit ? '✅' : '🤝'}</span>
          <span>${statusLabel}</span>
        </div>
        <div class="balance-figure">${formatCurrency(bal)}</div>
        <div class="balance-helper">
          ${t('lastTransactionDate')} ${lastTx ? formatDate(lastTx.date) : t('never')}
        </div>
      </div>

      <!-- Lifetime Statistics -->
      <div class="stat-cards-grid">
        <div class="stat-card">
          <div class="stat-card-label">${t('totalFeedTaken')}</div>
          <div class="stat-card-value" style="color: #b45309;">${formatCurrency(summary.totalFeedTaken)}</div>
        </div>

        <div class="stat-card">
          <div class="stat-card-label">${t('totalPaymentsMade')}</div>
          <div class="stat-card-value" style="color: #047857;">${formatCurrency(summary.totalPaymentsMade)}</div>
        </div>
      </div>

      <!-- Chronological Read-Only Ledger -->
      <div class="section-header">
        <div class="section-title">
          <span>📖</span> ${t('transactionsHistory')} (${ledgerTxs.length})
        </div>
      </div>

      <div class="tx-timeline-list">
        ${renderTransactionListHtml(ledgerTxs, false)}
      </div>
    `;

  } catch (err) {
    dom.appContent.innerHTML = `
      <div class="alert-box alert-danger">${err.message}</div>
      <button class="btn-primary" onclick="window.location.reload()">${t('confirm')}</button>
    `;
  }
}

// ==========================================================================
// Fast 2-Tap Add Transaction Modal
// ==========================================================================

function openAddTxModal(memberId, memberName) {
  let selectedType = 'feed_given'; // Default to feed given
  const today = new Date().toISOString().split('T')[0];

  dom.addTxModal.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-sheet-header">
        <div>
          <div class="modal-title">${t('quickAddEntry')}</div>
          <div style="font-size: 13px; color: var(--text-muted); font-weight: 600;">${memberName}</div>
        </div>
        <button class="close-sheet-btn" id="btnCloseAddTx">✕</button>
      </div>

      <form id="addTxForm">
        <!-- Type Toggle Buttons (कांडी vs जमा) -->
        <div class="type-toggle-container">
          <button type="button" class="type-toggle-btn active feed" id="toggleFeed">
            <span style="font-size: 20px;">🌾</span>
            <span>${t('feedGiven')}</span>
          </button>
          <button type="button" class="type-toggle-btn" id="togglePay">
            <span style="font-size: 20px;">💵</span>
            <span>${t('paymentReceived')}</span>
          </button>
        </div>

        <!-- Amount Input -->
        <div class="form-group">
          <label class="form-label">${t('amount')}</label>
          <input type="number" id="txAmount" class="form-input" placeholder="₹0.00" step="any" min="1" required autofocus style="font-size: 22px; font-weight: 700; color: var(--primary);" />
        </div>

        <!-- Quick Chips for common descriptions -->
        <div class="form-label" style="margin-bottom: 4px;">तपशील निवडा (Quick Description):</div>
        <div class="chips-scroll" id="noteChips">
          <span class="note-chip">${t('chipSugras')}</span>
          <span class="note-chip">${t('chipSarki')}</span>
          <span class="note-chip">${t('chipMaka')}</span>
          <span class="note-chip">${t('chipMilkBill')}</span>
          <span class="note-chip">${t('chipCash')}</span>
        </div>

        <!-- Note Text Input -->
        <div class="form-group">
          <input type="text" id="txNote" class="form-input" placeholder="${t('note')}" />
        </div>

        <!-- Date Input -->
        <div class="form-group">
          <label class="form-label">${t('date')}</label>
          <input type="date" id="txDate" class="form-input" value="${today}" required />
        </div>

        <div id="addTxError" style="color: var(--danger); font-size: 13px; margin-bottom: 12px; display: none;"></div>

        <button type="submit" class="btn-primary" id="btnSaveTx">
          ${t('save')}
        </button>
      </form>
    </div>
  `;

  dom.addTxModal.classList.add('open');

  // Close button
  document.getElementById('btnCloseAddTx').addEventListener('click', () => {
    dom.addTxModal.classList.remove('open');
  });

  // Type toggles
  const btnFeed = document.getElementById('toggleFeed');
  const btnPay = document.getElementById('togglePay');

  btnFeed.addEventListener('click', () => {
    selectedType = 'feed_given';
    btnFeed.className = 'type-toggle-btn active feed';
    btnPay.className = 'type-toggle-btn';
  });

  btnPay.addEventListener('click', () => {
    selectedType = 'payment';
    btnPay.className = 'type-toggle-btn active payment';
    btnFeed.className = 'type-toggle-btn';
  });

  // Note chips click
  document.querySelectorAll('#noteChips .note-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('txNote').value = chip.textContent;
    });
  });

  // Submit Handler
  document.getElementById('addTxForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = document.getElementById('txAmount').value;
    const note = document.getElementById('txNote').value;
    const date = document.getElementById('txDate').value;
    const btn = document.getElementById('btnSaveTx');
    const errBox = document.getElementById('addTxError');

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;
    errBox.style.display = 'none';

    try {
      await api.addTransaction({
        memberId,
        type: selectedType,
        amount: Number(amount),
        note,
        date
      });

      dom.addTxModal.classList.remove('open');
      // Refresh current view
      if (state.selectedMemberId === memberId) {
        renderAdminMemberLedger(memberId);
      } else {
        renderAdminDashboard();
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = t('save');
    }
  });
}

// ==========================================================================
// Edit Transaction Modal (with Recalculation Warning)
// ==========================================================================

function openEditTxModal(tx) {
  let selectedType = tx.type;

  dom.addTxModal.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-sheet-header">
        <div class="modal-title">${t('edit')} - नोंद दुरुस्ती</div>
        <button class="close-sheet-btn" id="btnCloseEditTx">✕</button>
      </div>

      <!-- Recalculation Warning Alert -->
      <div class="alert-box alert-warning">
        <span style="font-size: 18px;">⚠️</span>
        <div>
          <strong style="display: block; margin-bottom: 2px;">${t('recalcWarningTitle')}</strong>
          <span>${t('recalcWarningBody')}</span>
        </div>
      </div>

      <form id="editTxForm">
        <div class="type-toggle-container">
          <button type="button" class="type-toggle-btn ${selectedType === 'feed_given' ? 'active feed' : ''}" id="editToggleFeed">
            <span>🌾</span>
            <span>${t('feedGiven')}</span>
          </button>
          <button type="button" class="type-toggle-btn ${selectedType === 'payment' ? 'active payment' : ''}" id="editTogglePay">
            <span>💵</span>
            <span>${t('paymentReceived')}</span>
          </button>
        </div>

        <div class="form-group">
          <label class="form-label">${t('amount')}</label>
          <input type="number" id="editTxAmount" class="form-input" value="${tx.amount}" step="any" min="1" required style="font-size: 20px; font-weight: 700; color: var(--primary);" />
        </div>

        <div class="form-group">
          <label class="form-label">${t('note')}</label>
          <input type="text" id="editTxNote" class="form-input" value="${tx.note || ''}" />
        </div>

        <div class="form-group">
          <label class="form-label">${t('date')}</label>
          <input type="date" id="editTxDate" class="form-input" value="${tx.date}" required />
        </div>

        <div id="editTxError" style="color: var(--danger); font-size: 13px; margin-bottom: 12px; display: none;"></div>

        <button type="submit" class="btn-primary" id="btnSaveEditTx">
          ${t('save')}
        </button>
      </form>
    </div>
  `;

  dom.addTxModal.classList.add('open');

  document.getElementById('btnCloseEditTx').addEventListener('click', () => {
    dom.addTxModal.classList.remove('open');
  });

  const btnFeed = document.getElementById('editToggleFeed');
  const btnPay = document.getElementById('editTogglePay');

  btnFeed.addEventListener('click', () => {
    selectedType = 'feed_given';
    btnFeed.className = 'type-toggle-btn active feed';
    btnPay.className = 'type-toggle-btn';
  });

  btnPay.addEventListener('click', () => {
    selectedType = 'payment';
    btnPay.className = 'type-toggle-btn active payment';
    btnFeed.className = 'type-toggle-btn';
  });

  document.getElementById('editTxForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = document.getElementById('editTxAmount').value;
    const note = document.getElementById('editTxNote').value;
    const date = document.getElementById('editTxDate').value;
    const btn = document.getElementById('btnSaveEditTx');
    const errBox = document.getElementById('editTxError');

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;
    errBox.style.display = 'none';

    try {
      await api.editTransaction(tx.id, {
        type: selectedType,
        amount: Number(amount),
        note,
        date
      });

      dom.addTxModal.classList.remove('open');
      if (state.selectedMemberId) {
        renderAdminMemberLedger(state.selectedMemberId);
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = t('save');
    }
  });
}

// ==========================================================================
// Delete Confirmation Modal (with Recalculation Warning)
// ==========================================================================

function openDeleteConfirmModal(tx) {
  dom.confirmModal.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-sheet-header">
        <div class="modal-title" style="color: var(--danger);">${t('delete')}</div>
        <button class="close-sheet-btn" id="btnCloseConfirm">✕</button>
      </div>

      <div class="alert-box alert-danger">
        <span style="font-size: 22px;">⚠️</span>
        <div>
          <strong style="display: block; margin-bottom: 4px;">${t('recalcWarningTitle')}</strong>
          <span>${t('recalcWarningBody')}</span>
        </div>
      </div>

      <p style="font-size: 14px; margin-bottom: 16px;">
        ${t('confirmDeletePrompt')}<br>
        <strong>${tx.type === 'feed_given' ? t('feedGiven') : t('paymentReceived')} - ${formatCurrency(tx.amount)} (${formatDate(tx.date)})</strong>
      </p>

      <div id="delError" style="color: var(--danger); font-size: 13px; margin-bottom: 12px; display: none;"></div>

      <div style="display: flex; gap: 10px;">
        <button type="button" class="btn-secondary" id="btnCancelDel">${t('cancel')}</button>
        <button type="button" class="btn-primary" style="background: var(--danger);" id="btnConfirmDel">
          ${t('delete')}
        </button>
      </div>
    </div>
  `;

  dom.confirmModal.classList.add('open');

  const close = () => dom.confirmModal.classList.remove('open');
  document.getElementById('btnCloseConfirm').addEventListener('click', close);
  document.getElementById('btnCancelDel').addEventListener('click', close);

  document.getElementById('btnConfirmDel').addEventListener('click', async () => {
    const btn = document.getElementById('btnConfirmDel');
    const errBox = document.getElementById('delError');

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;
    errBox.style.display = 'none';

    try {
      await api.deleteTransaction(tx.id);
      close();
      if (state.selectedMemberId) {
        renderAdminMemberLedger(state.selectedMemberId);
      }
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = t('delete');
    }
  });
}

// ==========================================================================
// Add Member Modal (Admin)
// ==========================================================================

function openAddMemberModal() {
  dom.addMemberModal.innerHTML = `
    <div class="modal-sheet">
      <div class="modal-sheet-header">
        <div class="modal-title">${t('addNewMember')}</div>
        <button class="close-sheet-btn" id="btnCloseAddMember">✕</button>
      </div>

      <form id="adminAddMemberForm">
        <div class="form-group">
          <label class="form-label">${t('fullName')}</label>
          <input type="text" id="newMemberName" class="form-input" placeholder="उदा. चंद्रकांत पाटील" required autofocus />
        </div>

        <div class="form-group">
          <label class="form-label">मोबाईल नंबर (Mobile Number)</label>
          <input type="tel" id="newMemberPhone" class="form-input" placeholder="98XXXXXXXX" maxlength="10" required />
        </div>

        <div class="form-group">
          <label class="form-label">${t('villageName')}</label>
          <input type="text" id="newMemberVillage" class="form-input" placeholder="उदा. शिरोळी" />
        </div>

        <div class="form-group">
          <label class="form-label">${t('memberCode')}</label>
          <input type="text" id="newMemberCode" class="form-input" placeholder="उदा. 48" />
        </div>

        <div class="form-group">
          <label class="form-label">आरंभीची बाकी (Opening Balance ₹, optional)</label>
          <input type="number" id="newMemberOpening" class="form-input" placeholder="0" min="0" />
        </div>

        <div id="newMemberError" style="color: var(--danger); font-size: 13px; margin-bottom: 12px; display: none;"></div>

        <button type="submit" class="btn-primary" id="btnSaveMember">
          ${t('save')}
        </button>
      </form>
    </div>
  `;

  dom.addMemberModal.classList.add('open');

  document.getElementById('btnCloseAddMember').addEventListener('click', () => {
    dom.addMemberModal.classList.remove('open');
  });

  document.getElementById('adminAddMemberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.getElementById('newMemberName').value.trim();
    const phoneNumber = document.getElementById('newMemberPhone').value.trim();
    const village = document.getElementById('newMemberVillage').value.trim();
    const memberCode = document.getElementById('newMemberCode').value.trim();
    const openingBalance = document.getElementById('newMemberOpening').value.trim();
    const btn = document.getElementById('btnSaveMember');
    const errBox = document.getElementById('newMemberError');

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner"></span>`;
    errBox.style.display = 'none';

    try {
      await api.createMember({
        fullName,
        phoneNumber,
        village,
        memberCode,
        openingBalance: Number(openingBalance) || 0
      });

      dom.addMemberModal.classList.remove('open');
      renderAdminDashboard();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.style.display = 'block';
      btn.disabled = false;
      btn.textContent = t('save');
    }
  });
}

// Utility debounce helper
function debounce(fn, ms) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

// Start app on DOM ready
document.addEventListener('DOMContentLoaded', initApp);
