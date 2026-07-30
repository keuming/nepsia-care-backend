const { sql } = require('../db');
const { requireAuth } = require('../lib/auth');

function mapIntervention(r) {
  return {
    id: r.id,
    date: r.date,
    heure: r.heure,
    patientId: r.patient_id,
    intervenantId: r.intervenant_id,
    service: r.service,
    statut: r.statut,
    notes: r.notes,
    createdAt: r.created_at,
  };
}

module.exports = requireAuth(async (req, res) => {
  try {
    const { id, date } = req.query;

    if (req.method === 'GET') {
      if (id) {
        const rows = await sql`select * from interventions where id = ${id}`;
        if (!rows.length) return res.status(404).json({ error: 'Intervention introuvable' });
        return res.status(200).json(mapIntervention(rows[0]));
      }
      if (date) {
        const rows = await sql`select * from interventions where date = ${date} order by heure asc`;
        return res.status(200).json(rows.map(mapIntervention));
      }
      const rows = await sql`select * from interventions order by date desc, heure asc`;
      return res.status(200).json(rows.map(mapIntervention));
    }

    if (req.method === 'POST') {
      const b = req.body || {};
      if (!b.date || !b.heure || !b.patientId || !b.intervenantId || !b.service) {
        return res.status(400).json({ error: 'date, heure, patientId, intervenantId et service sont requis' });
      }
      const rows = await sql`
        insert into interventions (date, heure, patient_id, intervenant_id, service, statut, notes)
        values (${b.date}, ${b.heure}, ${b.patientId}, ${b.intervenantId}, ${b.service},
                ${b.statut ?? 'planifiée'}, ${b.notes ?? ''})
        returning *`;
      return res.status(201).json(mapIntervention(rows[0]));
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'Paramètre id requis' });
      const existing = await sql`select * from interventions where id = ${id}`;
      if (!existing.length) return res.status(404).json({ error: 'Intervention introuvable' });
      const cur = existing[0];
      const b = req.body || {};
      const rows = await sql`
        update interventions set
          date = ${b.date ?? cur.date},
          heure = ${b.heure ?? cur.heure},
          patient_id = ${b.patientId ?? cur.patient_id},
          intervenant_id = ${b.intervenantId ?? cur.intervenant_id},
          service = ${b.service ?? cur.service},
          statut = ${b.statut ?? cur.statut},
          notes = ${b.notes ?? cur.notes},
          updated_at = now()
        where id = ${id}
        returning *`;
      return res.status(200).json(mapIntervention(rows[0]));
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'Paramètre id requis' });
      await sql`delete from interventions where id = ${id}`;
      return res.status(204).end();
    }

    res.setHeader('Allow', 'GET,POST,PUT,DELETE,OPTIONS');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur serveur', detail: e.message });
  }
});
