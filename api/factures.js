const { sql } = require('../db');
const { requireAuth } = require('../lib/auth');

function mapFacture(r) {
  return {
    id: r.id,
    type: r.type,
    cible: r.cible,
    service: r.service,
    montant: Number(r.montant),
    date: r.date,
    statut: r.statut,
    createdAt: r.created_at,
  };
}

module.exports = requireAuth(async (req, res) => {
  try {
    const { id } = req.query;

    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`select * from factures where id = ${id}`;
        if (!rows.length) return res.status(404).json({ error: 'Facture introuvable' });
        return res.status(200).json(mapFacture(rows[0]));
      }
      const rows = await sql`select * from factures order by date desc`;
      return res.status(200).json(rows.map(mapFacture));
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.cible || !b.type) return res.status(400).json({ error: 'type et cible sont requis' });
      const rows = await sql`
        insert into factures (type, cible, service, montant, date, statut)
        values (${b.type}, ${b.cible}, ${b.service ?? ''}, ${b.montant ?? 0},
                ${b.date ?? new Date().toISOString().slice(0, 10)}, ${b.statut ?? 'en attente'})
        returning *`;
      return res.status(201).json(mapFacture(rows[0]));
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Paramètre id requis' });
      const existing = await sql`select * from factures where id = ${id}`;
      if (!existing.length) return res.status(404).json({ error: 'Facture introuvable' });
      const cur = existing[0];
      const b = req.body || {};
      const rows = await sql`
        update factures set
          type = ${b.type ?? cur.type},
          cible = ${b.cible ?? cur.cible},
          service = ${b.service ?? cur.service},
          montant = ${b.montant ?? cur.montant},
          date = ${b.date ?? cur.date},
          statut = ${b.statut ?? cur.statut},
          updated_at = now()
        where id = ${id}
        returning *`;
      return res.status(200).json(mapFacture(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Paramètre id requis' });
      await sql`delete from factures where id = ${id}`;
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE,OPTIONS');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur', detail: e.message });
  }
});
