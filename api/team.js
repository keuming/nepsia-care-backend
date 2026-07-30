const { sql } = require('../db');
const { requireAuth } = require('../lib/auth');

function mapTeam(r) {
  return {
    id: r.id,
    nom: r.nom,
    role: r.role,
    tel: r.tel,
    dispo: r.dispo,
    formations: r.formations,
    prochaine: r.prochaine_formation,
    createdAt: r.created_at,
  };
}

module.exports = requireAuth(async (req, res) => {
  try {
    const { id } = req.query;

    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`select * from team where id = ${id}`;
        if (!rows.length) return res.status(404).json({ error: 'Professionnel introuvable' });
        return res.status(200).json(mapTeam(rows[0]));
      }
      const rows = await sql`select * from team order by nom asc`;
      return res.status(200).json(rows.map(mapTeam));
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.nom || !b.role) return res.status(400).json({ error: 'nom et role sont requis' });
      const rows = await sql`
        insert into team (nom, role, tel, dispo, formations, prochaine_formation)
        values (${b.nom}, ${b.role}, ${b.tel ?? null}, ${b.dispo ?? true},
                ${JSON.stringify(b.formations ?? [])}, ${b.prochaine ?? null})
        returning *`;
      return res.status(201).json(mapTeam(rows[0]));
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Paramètre id requis' });
      const existing = await sql`select * from team where id = ${id}`;
      if (!existing.length) return res.status(404).json({ error: 'Professionnel introuvable' });
      const cur = existing[0];
      const b = req.body || {};
      const rows = await sql`
        update team set
          nom = ${b.nom ?? cur.nom},
          role = ${b.role ?? cur.role},
          tel = ${b.tel ?? cur.tel},
          dispo = ${b.dispo ?? cur.dispo},
          formations = ${JSON.stringify(b.formations ?? cur.formations)},
          prochaine_formation = ${b.prochaine ?? cur.prochaine_formation},
          updated_at = now()
        where id = ${id}
        returning *`;
      return res.status(200).json(mapTeam(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Paramètre id requis' });
      await sql`delete from team where id = ${id}`;
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE,OPTIONS');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur', detail: e.message });
  }
});
