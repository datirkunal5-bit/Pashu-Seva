import { Router } from 'express';
import {
  adminLogin,
  sendMemberOtp,
  verifyMemberOtp,
  registerMember
} from '../services/authService.js';

export function createAuthRouter(db) {
  const router = Router();

  // Admin login
  router.post('/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
      }
      const result = await adminLogin(db, username, password);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  });

  // Member send OTP
  router.post('/member/send-otp', async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      if (!phoneNumber) {
        return res.status(400).json({ error: 'Mobile number is required' });
      }
      const result = await sendMemberOtp(db, phoneNumber);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Member verify OTP
  router.post('/member/verify-otp', async (req, res) => {
    try {
      const { phoneNumber, otpCode } = req.body;
      if (!phoneNumber || !otpCode) {
        return res.status(400).json({ error: 'Mobile number and OTP code are required' });
      }
      const result = await verifyMemberOtp(db, phoneNumber, otpCode);
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Member self-registration
  router.post('/member/register', async (req, res) => {
    try {
      const { phoneNumber, fullName, village, memberCode } = req.body;
      const result = await registerMember(db, {
        phoneNumber,
        fullName,
        village,
        memberCode
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  return router;
}
