const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { setCors } = require('./cors');

const SECRET = process.env.JWT_SECRET || 'change-me-in-production';

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '12h' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

/**
 * Enveloppe une route API pour exiger un jeton valide (header Authorization: Bearer <token>).
 * Gère aussi le CORS et les requêtes OPTIONS (préflight) pour éviter de le répéter dans chaque route.
 */
function requireAuth(handler) {
  return async (req, res) => {
    setCors(res);
    if (req.method === 'OPTIONS') return res.status(200).end();

    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentification requise' });

    try {
      req.user = verifyToken(token);
    } catch (e) {
      return res.status(401).json({ error: 'Session invalide ou expirée, veuillez vous reconnecter' });
    }

    return handler(req, res);
  };
}

module.exports = { hashPassword, comparePassword, signToken, verifyToken, requireAuth };
