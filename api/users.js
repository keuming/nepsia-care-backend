const { sql } = require('../db');
const { requireAuth, hashPassword } = require('../lib/auth');

module.exports = requireAuth(async (req, res) => {
  if (req.user.role !== 'Direction') {
    return res.status(403).json({ error: 'Réservé au profil Direction' });
  }

  try {
    const { id } = req.query;

    if (req.method === 'GET') {
      const rows = await sql`select id, nom, telephone, role, created_at from users order by nom asc`;
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.nom || !b.telephone || !b.pin || !b.role) {
        return res.status(400).json({ error: 'nom, telephone, pin et role sont requis' });
      }
      if (!/^\d{4}$/.test(b.pin)) {
        return res.status(400).json({ error: 'Le code PIN doit contenir exactement 4 chiffres' });
      }
      const cleanTel = String(b.telephone).replace(/\s+/g, '').trim();
      const hash = await hashPassword(b.pin);
      try {
        const rows = await sql`
          insert into users (nom, telephone, pin_hash, role)
          values (${b.nom}, ${cleanTel}, ${hash}, ${b.role})
          returning id, nom, telephone, role, created_at`;
        return res.status(201).json(rows[0]);
      } catch (e) {
        if (String(e.message).includes('duplicate') || e.code === '23505') {
          return res.status(409).json({ error: 'Un compte existe déjà avec ce numéro de téléphone' });
        }
        throw e;
      }
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Paramètre id requis' });
      if (id === req.user.id) return res.status(400).json({ error: 'Impossible de supprimer votre propre compte' });
      await sql`delete from users where id = ${id}`;
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET,POST,DELETE,OPTIONS');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur', detail: e.message });
  }
});
