# NEPSIA CARE — Backend

API REST (fonctions serverless Vercel, Node.js) pour la plateforme NEPSIA CARE, connectée à PostgreSQL (Neon), avec authentification par compte utilisateur.

## Routes disponibles

| Ressource | Endpoint | Méthodes | Authentification |
|---|---|---|---|
| Connexion | `/api/auth/login` | POST | Publique |
| Comptes utilisateurs | `/api/users` | GET, POST, DELETE `?id=` | Jeton requis, réservé au rôle "Direction" |
| Patients & Admission HAD | `/api/patients` | GET, POST, PUT `?id=`, DELETE `?id=` | Jeton requis |
| Équipe & Formations | `/api/team` | GET, POST, PUT `?id=`, DELETE `?id=` | Jeton requis |
| Planning & Interventions | `/api/interventions` | GET (`?date=`), POST, PUT `?id=`, DELETE `?id=` | Jeton requis |
| Santé au Travail | `/api/entreprises` | GET, POST, PUT `?id=`, DELETE `?id=` | Jeton requis |
| Facturation | `/api/factures` | GET, POST, PUT `?id=`, DELETE `?id=` | Jeton requis |
| Initialisation (schéma + démo) | `/api/seed` | POST, header `x-admin-key` | Clé admin |

"Jeton requis" = header `Authorization: Bearer <token>` obtenu via `/api/auth/login`.

## Déploiement (Vercel — sans build local)

1. Créez un dépôt GitHub pour ce dossier et poussez-le (voir commandes ci-dessous).
2. Sur [vercel.com](https://vercel.com) : **Add New → Project** → importez le dépôt.
3. Dans **Settings → Environment Variables**, ajoutez :
   - `DATABASE_URL` = votre chaîne de connexion Neon
   - `ADMIN_SEED_KEY` = une clé secrète de votre choix
   - `JWT_SECRET` = une longue chaîne aléatoire (ex. générée avec `openssl rand -hex 32`) — **indispensable**, sans elle les sessions ne sont pas sécurisées
4. Déployez.

## Initialiser la base de données et créer le premier compte

Appelez une fois la route `/api/seed` :

```bash
curl -X POST https://VOTRE-PROJET.vercel.app/api/seed \
  -H "x-admin-key: VOTRE_ADMIN_SEED_KEY"
```

La réponse contient, **une seule fois**, l'email et le mot de passe généré du premier compte (rôle "Direction") :
```json
{ "compteCree": { "email": "direction@nepsia.org", "motDePasse": "..." } }
```
Notez-le immédiatement. Connectez-vous ensuite avec ce compte pour créer les comptes du reste de l'équipe depuis l'écran "Comptes utilisateurs" de l'application (réservé au rôle Direction).

## Commandes Git pour publier ce backend

```bash
cd nepsia-care-backend
git init
git add .
git commit -m "Backend NEPSIA CARE — API + PostgreSQL + authentification"
git branch -M main
git remote add origin https://github.com/keuming/nepsia-care-backend.git
git push -u origin main
```

## Sécurité

- `DATABASE_URL` et `JWT_SECRET` ne doivent **jamais** être committées dans le dépôt — elles vivent uniquement dans les variables d'environnement Vercel (`.env` est ignoré par git).
- Chaque route métier vérifie un jeton JWT valide ; sans compte, aucun accès aux données patients.
- La gestion des comptes (`/api/users`) est réservée au rôle "Direction".
- Pensez à changer `ADMIN_SEED_KEY` par une valeur qui vous est propre — la valeur par défaut ne doit pas rester active en production.

