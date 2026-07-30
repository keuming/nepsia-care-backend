const { sql } = require('../db');
const { requireAuth } = require('../lib/auth');

const DEFAULT_ADMISSION = { eval: { done: false }, inf: { done: false }, ergo: { done: false }, coord: { done: false } };

function mapPatient(r) {
  return {
    id: r.id,
    nom: r.nom,
    prenom: r.prenom,
    age: r.age,
    tel: r.tel,
    adresse: r.adresse,
    pathologie: r.pathologie,
    allergies: r.allergies,
    medecinTraitant: r.medecin_traitant,
    statut: r.statut,
    services: r.services,
    planSoins: r.plan_soins,
    admission: r.admission,
    createdAt: r.created_at,
  };
}

module.exports = requireAuth(async (req, res) => {
  try {
    const { id } = req.query;

    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`select * from patients where id = ${id}`;
        if (!rows.length) return res.status(404).json({ error: 'Patient introuvable' });
        return res.status(200).json(mapPatient(rows[0]));
      }
      const rows = await sql`select * from patients order by created_at desc`;
      return res.status(200).json(rows.map(mapPatient));
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.nom || !b.prenom) return res.status(400).json({ error: 'nom et prenom sont requis' });
      const rows = await sql`
        insert into patients
          (nom, prenom, age, tel, adresse, pathologie, allergies, medecin_traitant, statut, services, plan_soins, admission)
        values
          (${b.nom}, ${b.prenom}, ${b.age ?? null}, ${b.tel ?? null}, ${b.adresse ?? null},
           ${b.pathologie ?? null}, ${b.allergies ?? 'Aucune connue'}, ${b.medecinTraitant ?? null},
           ${b.statut ?? 'actif'}, ${JSON.stringify(b.services ?? [])}, ${b.planSoins ?? ''},
           ${JSON.stringify(b.admission ?? DEFAULT_ADMISSION)})
        returning *`;
      return res.status(201).json(mapPatient(rows[0]));
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Paramètre id requis' });
      const existing = await sql`select * from patients where id = ${id}`;
      if (!existing.length) return res.status(404).json({ error: 'Patient introuvable' });
      const cur = existing[0];
      const b = req.body || {};
      const rows = await sql`
        update patients set
          nom = ${b.nom ?? cur.nom},
          prenom = ${b.prenom ?? cur.prenom},
          age = ${b.age ?? cur.age},
          tel = ${b.tel ?? cur.tel},
          adresse = ${b.adresse ?? cur.adresse},
          pathologie = ${b.pathologie ?? cur.pathologie},
          allergies = ${b.allergies ?? cur.allergies},
          medecin_traitant = ${b.medecinTraitant ?? cur.medecin_traitant},
          statut = ${b.statut ?? cur.statut},
          services = ${JSON.stringify(b.services ?? cur.services)},
          plan_soins = ${b.planSoins ?? cur.plan_soins},
          admission = ${JSON.stringify(b.admission ?? cur.admission)},
          updated_at = now()
        where id = ${id}
        returning *`;
      return res.status(200).json(mapPatient(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Paramètre id requis' });
      await sql`delete from patients where id = ${id}`;
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE,OPTIONS');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur', detail: e.message });
  }
});
