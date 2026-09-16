/**
 * API client module for Pashu Khadya Ledger
 */

const API_BASE = '/api';

export const authStorage = {
  getAdminToken: () => localStorage.getItem('pk_admin_token'),
  setAdminToken: (token) => localStorage.setItem('pk_admin_token', token),
  getAdminUser: () => JSON.parse(localStorage.getItem('pk_admin_user') || 'null'),
  setAdminUser: (u) => localStorage.setItem('pk_admin_user', JSON.stringify(u)),
  clearAdmin: () => {
    localStorage.removeItem('pk_admin_token');
    localStorage.removeItem('pk_admin_user');
  },

  getMemberToken: () => localStorage.getItem('pk_member_token'),
  setMemberToken: (token) => localStorage.setItem('pk_member_token', token),
  getMemberUser: () => JSON.parse(localStorage.getItem('pk_member_user') || 'null'),
  setMemberUser: (u) => localStorage.setItem('pk_member_user', JSON.stringify(u)),
  clearMember: () => {
    localStorage.removeItem('pk_member_token');
    localStorage.removeItem('pk_member_user');
  }
};

async function request(endpoint, options = {}, role = 'admin') {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = role === 'admin' ? authStorage.getAdminToken() : authStorage.getMemberToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data.error || `HTTP Error ${res.status}`;
      throw new Error(msg);
    }

    return data;
  } catch (err) {
    if (!navigator.onLine) {
      throw new Error('इंटरनेट कनेक्शन नाही (Offline). कृपया नेटवर्क तपासा.');
    }
    throw err;
  }
}

export const api = {
  // Auth API
  adminLogin: async (username, password) => {
    const data = await request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    authStorage.setAdminToken(data.token);
    authStorage.setAdminUser(data.admin);
    return data;
  },

  sendOtp: async (phoneNumber) => {
    return await request('/auth/member/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber })
    });
  },

  verifyOtp: async (phoneNumber, otpCode) => {
    const data = await request('/auth/member/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, otpCode })
    });
    if (data.authenticated) {
      authStorage.setMemberToken(data.token);
      authStorage.setMemberUser(data.member);
    }
    return data;
  },

  registerMember: async (memberData) => {
    const data = await request('/auth/member/register', {
      method: 'POST',
      body: JSON.stringify(memberData)
    });
    authStorage.setMemberToken(data.token);
    authStorage.setMemberUser(data.member);
    return data;
  },

  // Admin Endpoints
  getAdminDashboard: () => request('/admin/dashboard', {}, 'admin'),
  getMembers: (search = '', sort = 'balance_desc') => {
    const query = new URLSearchParams({ search, sort }).toString();
    return request(`/admin/members?${query}`, {}, 'admin');
  },
  createMember: (memberData) => request('/admin/members', {
    method: 'POST',
    body: JSON.stringify(memberData)
  }, 'admin'),
  getMemberLedger: (memberId) => request(`/admin/members/${memberId}/ledger`, {}, 'admin'),
  addTransaction: (txData) => request('/admin/transactions', {
    method: 'POST',
    body: JSON.stringify(txData)
  }, 'admin'),
  editTransaction: (txId, txData) => request(`/admin/transactions/${txId}`, {
    method: 'PUT',
    body: JSON.stringify(txData)
  }, 'admin'),
  deleteTransaction: (txId) => request(`/admin/transactions/${txId}`, {
    method: 'DELETE'
  }, 'admin'),

  // Member Endpoints
  getMemberMe: () => request('/member/me', {}, 'member'),
  getMemberOwnLedger: () => request('/member/ledger', {}, 'member')
};
