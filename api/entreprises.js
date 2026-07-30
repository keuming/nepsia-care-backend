const { sql } = require('../db');
const { requireAuth } = require('../lib/auth');

function mapEntreprise(r) {
  return {
    id: r.id,
    nom: r.nom,
    secteur: r.secteur,
    effectif: r.effectif,
    contact: r.contact,
    visites: r.visites,
    documentUnique: r.document_unique,
    campagnes: r.campagnes,
    createdAt: r.created_at,
  };
}

module.exports = requireAuth(async (req, res) => {
  try {
    const { id } = req.query;

    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`select * from entreprises where id = ${id}`;
        if (!rows.length) return res.status(404).json({ error: 'Entreprise introuvable' });
        return res.status(200).json(mapEntreprise(rows[0]));
      }
      const rows = await sql`select * from entreprises order by nom asc`;
      return res.status(200).json(rows.map(mapEntreprise));
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.nom) return res.status(400).json({ error: 'nom est requis' });
      const rows = await sql`
        insert into entreprises (nom, secteur, effectif, contact, visites, document_unique, campagnes)
        values (${b.nom}, ${b.secteur ?? null}, ${b.effectif ?? 0}, ${b.contact ?? null},
                ${JSON.stringify(b.visites ?? [])},
                ${JSON.stringify(b.documentUnique ?? { version: 'v1.0', date: null })},
                ${JSON.stringify(b.campagnes ?? [])})
        returning *`;
      return res.status(201).json(mapEntreprise(rows[0]));
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Paramètre id requis' });
      const existing = await sql`select * from entreprises where id = ${id}`;
      if (!existing.length) return res.status(404).json({ error: 'Entreprise introuvable' });
      const cur = existing[0];
      const b = req.body || {};
      const rows = await sql`
        update entreprises set
          nom = ${b.nom ?? cur.nom},
          secteur = ${b.secteur ?? cur.secteur},
          effectif = ${b.effectif ?? cur.effectif},
          contact = ${b.contact ?? cur.contact},
          visites = ${JSON.stringify(b.visites ?? cur.visites)},
          document_unique = ${JSON.stringify(b.documentUnique ?? cur.document_unique)},
          campagnes = ${JSON.stringify(b.campagnes ?? cur.campagnes)},
          updated_at = now()
        where id = ${id}
        returning *`;
      return res.status(200).json(mapEntreprise(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Paramètre id requis' });
      await sql`delete from entreprises where id = ${id}`;
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE,OPTIONS');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur', detail: e.message });
  }
});
