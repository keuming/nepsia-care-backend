const { sql } = require('../../db');
const { setCors } = require('../../lib/cors');
const { comparePassword, signToken } = require('../../lib/auth');

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { telephone, pin } = req.body || {};
    if (!telephone || !pin) {
      return res.status(400).json({ error: 'Numéro de téléphone et code PIN requis' });
    }
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'Le code PIN doit contenir exactement 4 chiffres' });
    }

    const cleanTel = telephone.replace(/\s+/g, '').trim();
    const rows = await sql`select * from users where telephone = ${cleanTel}`;
    if (!rows.length) return res.status(401).json({ error: 'Identifiants incorrects' });

    const user = rows[0];

    // Verrouillage temporaire après plusieurs échecs
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(423).json({ error: `Compte temporairement verrouillé — réessayez dans ${minutesLeft} min` });
    }

    const ok = await comparePassword(pin, user.pin_hash);
    if (!ok) {
      const attempts = (user.failed_attempts || 0) + 1;
      if (attempts >= MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60000).toISOString();
        await sql`update users set failed_attempts = 0, locked_until = ${lockUntil} where id = ${user.id}`;
        return res.status(423).json({ error: `Trop de tentatives — compte verrouillé ${LOCK_MINUTES} minutes` });
      }
      await sql`update users set failed_attempts = ${attempts} where id = ${user.id}`;
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Connexion réussie : réinitialiser le compteur
    if (user.failed_attempts > 0 || user.locked_until) {
      await sql`update users set failed_attempts = 0, locked_until = null where id = ${user.id}`;
    }

    const token = signToken({ id: user.id, telephone: user.telephone, nom: user.nom, role: user.role });
    return res.status(200).json({
      token,
      user: { id: user.id, nom: user.nom, telephone: user.telephone, role: user.role },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur', detail: e.message });
  }
};
