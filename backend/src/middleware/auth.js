import { verifyToken } from '../services/authService.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Authentication token required.' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired authentication token.' });
  }

  req.user = decoded;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Admin privileges required.' });
  }
  next();
}

export function requireMember(req, res, next) {
  if (!req.user || req.user.role !== 'member') {
    return res.status(403).json({ error: 'Forbidden. Member privileges required.' });
  }
  next();
}
