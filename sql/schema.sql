-- ============================================================
-- NEPSIA CARE — schéma PostgreSQL (Neon)
-- ============================================================
create extension if not exists pgcrypto;

-- ---------- Migration : passage du compte email/mot de passe à téléphone/PIN ----------
do $$
begin
  if exists (select 1 from information_schema.columns where table_name='users' and column_name='email') then
    drop table if exists users cascade;
  end if;
end $$;

-- ---------- Comptes utilisateurs (authentification par téléphone + code PIN) ----------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  telephone text not null unique,
  pin_hash text not null,
  role text not null default 'Coordination HAD',
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Patients & Admission HAD ----------
create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  prenom text not null,
  age integer,
  tel text,
  adresse text,
  pathologie text,
  allergies text default 'Aucune connue',
  medecin_traitant text,
  statut text not null default 'actif',                -- actif | clôturé
  services jsonb not null default '[]',                 -- ["soins","auxvie",...]
  plan_soins text default '',
  admission jsonb not null default
    '{"eval":{"done":false},"inf":{"done":false},"ergo":{"done":false},"coord":{"done":false}}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_patients_statut on patients(statut);

-- ---------- Équipe & Formations ----------
create table if not exists team (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  role text not null,                                   -- Médecin, Infirmier(ère), ...
  tel text,
  dispo boolean not null default true,
  formations jsonb not null default '[]',                -- [{theme,type,date}]
  prochaine_formation text,                               -- date texte AAAA-MM-JJ
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Planning & Interventions ----------
create table if not exists interventions (
  id uuid primary key default gen_random_uuid(),
  date text not null,                                    -- AAAA-MM-JJ
  heure text not null,                                    -- HH:MM
  patient_id uuid references patients(id) on delete set null,
  intervenant_id uuid references team(id) on delete set null,
  service text not null,
  statut text not null default 'planifiée',               -- planifiée|en cours|réalisée|annulée
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_interventions_date on interventions(date);

-- ---------- Santé au Travail (entreprises clientes) ----------
create table if not exists entreprises (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  secteur text,
  effectif integer default 0,
  contact text,
  visites jsonb not null default '[]',                    -- [{date,type,statut}]
  document_unique jsonb not null default '{"version":"v1.0","date":null}',
  campagnes jsonb not null default '[]',                  -- [{titre,date,statut}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Facturation ----------
create table if not exists factures (
  id uuid primary key default gen_random_uuid(),
  type text not null,                                     -- Patient | Entreprise
  cible text not null,
  service text,
  montant numeric(14,2) not null default 0,
  date text not null,                                      -- AAAA-MM-JJ
  statut text not null default 'en attente',                -- payée|en attente|retard
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
