const fs = require('fs');
const path = require('path');
const { Pool } = require('@neondatabase/serverless');
const { sql } = require('../db');
const { setCors } = require('../lib/cors');
const { hashPassword } = require('../lib/auth');

module.exports = async (req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST,OPTIONS');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const adminKey = req.headers['x-admin-key'];
  if (!adminKey || adminKey !== (process.env.ADMIN_SEED_KEY || 'nepsia_dev_secret_2026')) {
    return res.status(401).json({ error: 'Clé administrateur invalide' });
  }

  try {
    // 1. Créer les tables si elles n'existent pas encore (Pool = driver complet, supporte les scripts multi-instructions)
    const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    try {
      await pool.query(schema);
    } finally {
      await pool.end();
    }

    const result = { message: 'Schéma vérifié.' };

    // 2. Créer le compte administrateur général s'il n'existe pas encore (idempotent)
    const ADMIN_TEL = '0707039135';
    const ADMIN_PIN = '9135';
    const existingAdmin = await sql`select id from users where telephone = ${ADMIN_TEL}`;
    if (!existingAdmin.length) {
      const hash = await hashPassword(ADMIN_PIN);
      await sql`
        insert into users (nom, telephone, pin_hash, role)
        values ('Administrateur Général', ${ADMIN_TEL}, ${hash}, 'Direction')`;
      result.compteCree = {
        telephone: ADMIN_TEL,
        pin: ADMIN_PIN,
        note: "Compte administrateur général créé. Connectez-vous puis créez les autres comptes depuis 'Comptes utilisateurs'.",
      };
    } else {
      result.comptes = 'Le compte administrateur existe déjà — aucun compte créé.';
    }

    // 3. Insérer des données de démonstration (uniquement si la base est vide)
    const existing = await sql`select count(*)::int as n from patients`;
    if (existing[0].n > 0) {
      result.donnees = 'Des données existent déjà — aucune donnée de démonstration ajoutée.';
      return res.status(200).json(result);
    }

    const team = await sql`
      insert into team (nom, role, tel, dispo, prochaine_formation) values
      ('Dr TIABAS N''DA Eliane', 'Médecin', '01 02 78 18 38', true, '2026-09-20'),
      ('Aya Konan', 'Infirmier(ère)', '07 45 11 22 33', true, '2026-10-10'),
      ('Serge Boa', 'Infirmier(ère)', '05 12 34 56 78', true, '2026-08-05'),
      ('Marc Kouassi', 'Kinésithérapeute', '07 88 99 00 11', true, '2026-08-20')
      returning id`;

    const patients = await sql`
      insert into patients (nom, prenom, age, tel, adresse, pathologie, allergies, medecin_traitant, statut, services, plan_soins, admission) values
      ('Kouamé', 'Adjoua', 78, '01 44 55 66 77', 'Cocody Angré', 'AVC — suites de rééducation', 'Aucune connue', 'Dr Bamba', 'actif',
       '["soins","auxvie","repas"]', 'Kinésithérapie 3x/semaine, pansement quotidien.',
       '{"eval":{"done":true,"date":"2026-07-10","par":"Dr TIABAS N''DA Eliane"},"inf":{"done":true,"date":"2026-07-11","par":"Aya Konan"},"ergo":{"done":true,"date":"2026-07-12","par":"Marc Kouassi"},"coord":{"done":true,"date":"2026-07-13","par":"Coordination"}}'),
      ('Yao', 'Bertin', 64, '07 12 34 00 99', 'Riviera Palmeraie', 'Diabète type 2 — soins post-opératoires', 'Pénicilline', 'Dr Kone', 'actif',
       '["soins","surveillance","repas"]', 'Glycémie 2x/jour, pansement plaie.',
       '{"eval":{"done":true,"date":"2026-07-24","par":"Dr TIABAS N''DA Eliane"},"inf":{"done":true,"date":"2026-07-25","par":"Serge Boa"},"ergo":{"done":false},"coord":{"done":false}}')
      returning id`;

    result.message = 'Schéma créé et données de démonstration insérées avec succès.';
    result.team = team.length;
    result.patients = patients.length;
    return res.status(201).json(result);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Erreur lors de l\'initialisation', detail: e.message });
  }
};
