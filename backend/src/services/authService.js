import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'pashu-khadya-coop-society-secure-secret-2026';
const JWT_EXPIRES_IN = '30d';

export function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password, hash) {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Admin Login
 */
export async function adminLogin(db, username, password) {
  const admin = await db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin) {
    throw new Error('Invalid username or password');
  }

  const isMatch = comparePassword(password, admin.password_hash);
  if (!isMatch) {
    throw new Error('Invalid username or password');
  }

  const token = generateToken({
    id: admin.id,
    role: 'admin',
    username: admin.username,
    fullName: admin.full_name
  });

  return {
    token,
    admin: {
      id: admin.id,
      username: admin.username,
      fullName: admin.full_name
    }
  };
}

/**
 * Send OTP for Member Phone Login
 */
export async function sendMemberOtp(db, phoneNumber) {
  const cleanedPhone = phoneNumber.trim().replace(/\D/g, '').slice(-10);
  if (cleanedPhone.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number');
  }

  // Generate 6-digit OTP (e.g., 482910, or fixed testable OTP for demo)
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  await db.prepare(`
    INSERT INTO otps (phone_number, otp_code, expires_at)
    VALUES (?, ?, ?)
    ON CONFLICT(phone_number) DO UPDATE SET
      otp_code = excluded.otp_code,
      expires_at = excluded.expires_at
  `).run(cleanedPhone, otpCode, expiresAt);

  // Check if member already exists
  const existingMember = await db.prepare('SELECT * FROM members WHERE phone_number = ?').get(cleanedPhone);

  console.log(`📱 [OTP Service] Phone: +91 ${cleanedPhone} -> OTP Generated: ${otpCode} (or bypass: 123456)`);

  return {
    success: true,
    phoneNumber: cleanedPhone,
    isRegistered: !!existingMember,
    devOtp: otpCode, // For seamless testing & demo in UI
    message: `OTP sent to +91 ${cleanedPhone}`
  };
}

/**
 * Verify OTP and authenticate or prompt registration
 */
export async function verifyMemberOtp(db, phoneNumber, otpCode) {
  const cleanedPhone = phoneNumber.trim().replace(/\D/g, '').slice(-10);
  const otpRecord = await db.prepare('SELECT * FROM otps WHERE phone_number = ?').get(cleanedPhone);

  if (!otpRecord) {
    throw new Error('No OTP request found for this number. Please request a new OTP.');
  }

  if (Date.now() > otpRecord.expires_at) {
    await db.prepare('DELETE FROM otps WHERE phone_number = ?').run(cleanedPhone);
    throw new Error('OTP has expired. Please request a new OTP.');
  }

  // Allow standard demo bypass '123456' or matched OTP
  if (otpRecord.otp_code !== otpCode && otpCode !== '123456') {
    throw new Error('Invalid OTP code. Please try again.');
  }

  // Consume OTP
  await db.prepare('DELETE FROM otps WHERE phone_number = ?').run(cleanedPhone);

  // Check if member exists
  const member = await db.prepare('SELECT * FROM members WHERE phone_number = ?').get(cleanedPhone);
  if (!member) {
    return {
      authenticated: false,
      needsRegistration: true,
      phoneNumber: cleanedPhone
    };
  }

  const token = generateToken({
    id: member.id,
    role: 'member',
    phoneNumber: member.phone_number,
    fullName: member.full_name
  });

  return {
    authenticated: true,
    token,
    member: {
      id: member.id,
      fullName: member.full_name,
      phoneNumber: member.phone_number,
      village: member.village,
      memberCode: member.member_code,
      currentBalance: member.current_balance
    }
  };
}

/**
 * Member Self-Registration after OTP verification
 */
export async function registerMember(db, {
  phoneNumber,
  fullName,
  village = '',
  memberCode = ''
}) {
  const cleanedPhone = phoneNumber.trim().replace(/\D/g, '').slice(-10);
  if (cleanedPhone.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number');
  }
  if (!fullName || fullName.trim().length === 0) {
    throw new Error('Full name is required');
  }

  const existing = await db.prepare('SELECT id FROM members WHERE phone_number = ?').get(cleanedPhone);
  if (existing) {
    throw new Error('Member with this phone number already exists. Please log in.');
  }

  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO members (id, full_name, phone_number, village, member_code, current_balance, created_at)
    VALUES (?, ?, ?, ?, ?, 0.00, datetime('now'))
  `).run(id, fullName.trim(), cleanedPhone, village ? village.trim() : null, memberCode ? memberCode.trim() : null);

  const member = await db.prepare('SELECT * FROM members WHERE id = ?').get(id);

  const token = generateToken({
    id: member.id,
    role: 'member',
    phoneNumber: member.phone_number,
    fullName: member.full_name
  });

  return {
    token,
    member: {
      id: member.id,
      fullName: member.full_name,
      phoneNumber: member.phone_number,
      village: member.village,
      memberCode: member.member_code,
      currentBalance: member.current_balance
    }
  };
}
