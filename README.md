# Healthy Box — box repas santé, Corse

Application Next.js 16 (App Router) + React 19 + Supabase + Stripe Billing.

Requiert **Node 20 ou plus** (`node -v` pour vérifier).

---

## ⚠️ À lire avant de commencer

**Le choix de la région Supabase est irréversible.** À la création du projet,
choisissez **Frankfurt (eu-central-1)** ou **Paris (eu-west-3)**. Supabase crée
les projets aux États-Unis par défaut. Comme Healthy Box manipule des préférences liées
à la santé, l'hébergement européen est nettement plus défendable — et on ne peut
pas déplacer un projet ensuite.

**Aucune donnée médicale n'est stockée.** La catégorie de box (`diabete`,
`antiinflam`) est traitée comme une préférence de menu, au même titre que
« végétarien ». Il n'y a volontairement ni champ diagnostic, ni glycémie, ni
compte-rendu de consultation. Ne pas ajouter de tels champs sans avoir validé
le cadre juridique avec un avocat (voir `plan-technique-ortu.md`).

---

## 1. Installation locale

```bash
npm install
cp .env.local.example .env.local
```

Puis remplissez `.env.local` avec vos vraies clés (voir étapes 2 et 3).

```bash
npm run dev
```

Le site tourne sur http://localhost:3000

---

## Identité visuelle

| Élément | Valeur |
|---|---|
| Titres et texte | DM Sans (Google Fonts) |
| Accents manuscrits | Caveat (Google Fonts) |
| Logo « Healthy Box » | Oilvare Base — **police payante, non fournie** |
| Couleur de marque | `#C2184B` (framboise) |
| Bandes et footer | `#FFC6A5` (pêche) |
| Fonds | `#FDFBF7` crème, `#F5F1EA` sable |
| Pastels pictogrammes | `#F9E3E7` rose, `#DDE8D8` menthe |

### Activer Oilvare Base

Oilvare Base est vendue par Adam Ladd (fontspring.com, myfonts.com). Elle n'est
pas incluse ici. Pour l'installer :

1. acheter la licence **webfont** (pas seulement desktop)
2. déposer le fichier dans `public/fonts/OilvareBase-Regular.woff2`
3. décommenter le bloc `@font-face` en haut de `app/globals.css`
4. remplacer `--font-logo: var(--font-dm-sans)` par `--font-logo: "Oilvare Base"`

En attendant, le logo s'affiche en DM Sans gras interlettré.

⚠️ Ne téléchargez pas cette police sur les sites qui la proposent
gratuitement : ce sont des copies illicites, et l'utiliser sur un site
commercial vous expose à des poursuites.

### Lien Instagram

Le bouton du footer pointe vers `https://www.instagram.com/`. Remplacez l'URL
par celle du compte dans `components/Footer.jsx`.

---

## ⚠️ Mise à jour du schéma (si vous aviez déjà exécuté schema.sql)

La structure des livraisons a changé : codes postaux, jour récurrent, créneau
horaire, date limite de commande, liste d'attente. Le plus simple, tant qu'il
n'y a aucun client réel :

1. SQL Editor → collez `supabase/reset.sql` → Run (supprime toutes les tables)
2. SQL Editor → collez `supabase/schema.sql` → Run (recrée tout)

`reset.sql` détruit toutes les données. Ne l'exécutez jamais en production.

---

## Comment fonctionne le choix des recettes

C'est un **kit repas** : on livre les ingrédients pré-portionnés et la fiche
recette, pas des plats prêts à réchauffer.

**Les 15 recettes existent dans les deux box.** Ce qui change d'une box à
l'autre, ce sont les ingrédients et les valeurs nutritionnelles. D'où deux
tables :

| Table | Contenu |
|---|---|
| `recipes` | le plat : nom, description, photo, temps de préparation |
| `recipe_variants` | une ligne par box : ingrédients, kcal, index glycémique, atout mis en avant |

Exemple : « Fusilli complets, poulet et champignons » existe en version diabète
(fusilli complets, crème légère, parmesan) et en version anti-inflammatoire
(fusilli au sarrasin, crème d'avoine, curcuma).

- Le client choisit **exactement autant de recettes que de plats par semaine**
- Il peut **prendre plusieurs fois la même recette** : la sélection est un
  tableau avec répétitions, ex. `{3,3,7}` = deux fois la recette 3
- La sélection est **reconduite chaque semaine**, modifiable jusqu'à la date
  limite depuis l'espace client

Le serveur revérifie systématiquement : bon nombre de plats, variante existante
pour la box choisie, date limite non dépassée.

### Ajouter une recette

1. Une ligne dans `recipes` (avec `slug` unique, `position` pour l'ordre)
2. **Deux** lignes dans `recipe_variants`, une par box

Une recette n'apparaît que si `published = true`, et une contrainte SQL empêche
de publier sans `validated_by` et `validated_at` : la validation par la
diététicienne est obligatoire.

Les photos vont dans `public/images/recettes/`, référencées par le champ
`image`. 7 des 15 recettes en ont une ; les autres affichent « Photo à venir ».

---

## Comment fonctionne la livraison

Un abonnement est livré un **jour récurrent**, pas à une date isolée :

1. La personne saisit son **code postal** (pas une ville : ça gère les hameaux)
2. Le site trouve la tournée correspondante et annonce les jours desservis
3. Elle choisit son **jour habituel** — elle sera livrée ce jour-là chaque semaine
4. Elle choisit la date de sa **première** livraison parmi 3 propositions
5. Elle choisit un **créneau** (matin / soir), selon ce que la zone propose

Chaque date affiche sa **date limite de commande**, calculée à partir de
`lead_time_days` et `cutoff_time` de la zone.

⚠️ **`lead_time_days` est compté en JOURS OUVRÉS**, samedi et dimanche exclus :
on ne prépare pas les box le week-end. Le minimum est de 2, imposé à la fois par
une contrainte SQL et par le code — **jamais de livraison le jour même ni le
lendemain**, il faut le temps de commander les ingrédients.

Exemple : livraison le mardi avec 3 jours ouvrés de délai → lundi, vendredi,
jeudi, donc date limite le **jeudi précédent** à 20h. La date limite tombe
toujours un jour ouvré.

Les dates dont la limite est dépassée ne sont pas proposées, et le serveur
revérifie au moment du paiement (une page peut rester ouverte longtemps).

Si le code postal n'est pas desservi, un formulaire propose de **rejoindre la
liste d'attente** (table `waitlist`). C'est ce qui vous dira où étendre vos
tournées en priorité.

### Régler vos tournées

Tout se passe dans la table `delivery_zones` :

| Colonne | Rôle |
|---|---|
| `postal_codes` | les codes postaux de la tournée, ex. `{20000,20090}` |
| `allowed_days` | jours desservis, 1 = lundi … 7 = dimanche |
| `time_slots` | `{matin,soir}` ou `{matin}` seulement |
| `lead_time_days` | délai de préparation en **jours ouvrés** (minimum 2) |
| `cutoff_time` | heure limite le jour de la date butoir |
| `daily_capacity` | prévu pour limiter les livraisons par jour (pas encore utilisé) |

---

## 2. Configurer Supabase

1. Créez un projet sur https://supabase.com — **région Europe** (voir avertissement ci-dessus).
2. Allez dans **SQL Editor**, collez tout le contenu de `supabase/schema.sql`, exécutez.
3. Allez dans **Settings > API** et récupérez :
   - *Project URL* → `NEXT_PUBLIC_SUPABASE_URL`
   - *anon public* → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - *service_role* → `SUPABASE_SERVICE_ROLE_KEY` (**secret, jamais côté navigateur**)
4. Dans **Authentication > URL Configuration** :
   - *Site URL* : l'URL du site en ligne (pas localhost)
   - *Redirect URLs* : ajoutez `https://votre-domaine/**` et
     `http://localhost:3000/**` pour le développement

---

## Rendez-vous : Calendly

L'agenda de la naturopathe est géré par Calendly, pas par cette application :
disponibilités réelles, confirmations, rappels et annulations sont assurés par
le service. Aucune donnée de rendez-vous n'est stockée dans la base, ce qui
évite de conserver des informations liées à la santé des clients.

À configurer :

1. Créer un type d'événement sur calendly.com (ex. « Bilan 30 min »)
2. Copier son lien public
3. Le renseigner dans `NEXT_PUBLIC_CALENDLY_URL`, en local **et sur Vercel**

Sans cette variable, la page `/rdv` affiche un message indiquant que l'agenda
n'est pas configuré.

---

## Authentification : réglages obligatoires

### Robustesse du mot de passe

Le formulaire affiche les règles en direct, mais **cette validation est dans le
navigateur : elle ne protège de rien**. Quelqu'un peut appeler l'API Supabase
directement. La vraie barrière se règle dans le tableau de bord :

**Authentication > Sign In / Providers > Password**
- *Minimum password length* : **12**
- *Required characters* : lettres minuscules, majuscules, chiffres et symboles

Ces réglages doivent rester alignés avec `lib/password.js`. Si vous changez
l'un, changez l'autre.

Activez aussi **Leaked password protection** (même écran) : Supabase refuse
alors les mots de passe apparus dans des fuites connues.

### Confirmation d'email

**Authentication > Sign In / Providers > Email** → cocher **Confirm email**.

Sans cela, n'importe qui peut créer un compte avec l'adresse d'un tiers.
Pendant le développement on la désactive souvent pour aller vite : pensez à la
réactiver avant l'ouverture.

⚠️ Le service d'emails intégré de Supabase est limité à quelques messages par
heure et n'est **pas prévu pour la production**. Avant l'ouverture, configurez
un SMTP dans **Project Settings > Authentication > SMTP Settings** (Brevo,
Resend, Postmark…). Sinon vos clients ne recevront pas leurs confirmations.

### Connexion avec Google

1. Sur **console.cloud.google.com** : créez un projet, puis
   *API et services > Identifiants > Créer des identifiants >
   ID client OAuth*, type *Application Web*
2. Dans *URI de redirection autorisés*, collez l'URL fournie par Supabase
   (**Authentication > Sign In / Providers > Google**), de la forme
   `https://<projet>.supabase.co/auth/v1/callback`
3. Copiez l'ID client et le secret dans Supabase, puis activez *Google*
4. Complétez l'écran de consentement OAuth : sans cela Google bloque les
   comptes extérieurs à votre organisation

Le bouton « Continuer avec Google » renvoie vers `/auth/callback`, qui échange
le code contre une session.

### Modèles d'emails

**Authentication > Emails** : les messages par défaut sont en anglais et
signés Supabase. Traduisez au moins *Confirm signup* et *Reset password*, et
remplacez la signature par Healthy Box.

### Vérifier que la sécurité est active

Dans **Table Editor**, chaque table doit afficher le badge *RLS enabled*. Sans
ces règles, n'importe qui pourrait lire les données de tous les clients avec la
seule clé publique. C'est le point de sécurité le plus important du projet.

---

## 3. Configurer Stripe

1. Créez un compte sur https://stripe.com, restez en **mode Test**.
2. **Développeurs > Clés API** :
   - *Clé publiable* → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - *Clé secrète* → `STRIPE_SECRET_KEY`
3. Le webhook se configure **après** le déploiement (il faut l'URL publique).
   En attendant, mettez `STRIPE_WEBHOOK_SECRET=whsec_temporaire`.

Carte de test : `4242 4242 4242 4242`, date future, CVC au hasard.

> Les prix ne sont pas pré-créés dans Stripe : ils sont construits à la volée
> par `app/api/checkout/route.js` à partir de `lib/pricing.js`. Le montant
> envoyé par le navigateur n'est jamais utilisé — le serveur le recalcule.

---

## 4. Déployer sur Vercel

```bash
git init
git add .
git commit -m "Healthy Box - v1"
git remote add origin https://github.com/VOTRE-USERNAME/ortu.git
git branch -M main
git push -u origin main
```

Puis sur https://vercel.com : **Add New > Project** → importez le repo.

- **Framework Preset** : Next.js (détecté automatiquement)
- **Environment Variables** : ajoutez les 7 variables de `.env.local`
- `NEXT_PUBLIC_SITE_URL` : laissez vide au premier déploiement, puis renseignez
  l'URL Vercel et redéployez.

`vercel.json` force déjà l'exécution des fonctions sur `cdg1` (Paris).

### Configurer le webhook Stripe

1. **Stripe > Développeurs > Webhooks > Ajouter un endpoint**
2. URL : `https://VOTRE-URL.vercel.app/api/webhook`
3. Événements à écouter :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copiez le *signing secret* (`whsec_...`) dans `STRIPE_WEBHOOK_SECRET` sur Vercel
5. **Redeploy**

---

## 5. Test de bout en bout

1. Créez un compte sur `/connexion`, confirmez l'email
2. `/formules` → choisissez une box, une durée, une ville, une date
3. Payez avec `4242 4242 4242 4242`
4. Vous arrivez sur `/compte` — l'abonnement doit passer *actif* en quelques secondes
5. Testez *Suspendre*, puis *Réactiver*, puis *Annuler*
6. Vérifiez dans le dashboard Stripe que l'abonnement suit les mêmes états

---

## Structure

```
app/
  page.js                    accueil
  formules/                  configurateur (box, durée, taille, livraison)
  recettes/[categorie]/      diabete | antiinflam | classique
  livraison/                 zones et jours
  rdv/                       prise de rendez-vous diététicien
  compte/                    espace client (protégé)
  connexion/                 connexion et inscription
  api/
    checkout/                crée la session Stripe (revalide tout côté serveur)
    webhook/                 seule source de vérité du statut d'abonnement
    abonnement/              suspendre / réactiver / annuler
    rdv/                     réservation de créneau
lib/
  pricing.js                 tarifs et remises (partagé client/serveur)
  delivery.js                calcul des dates livrables par zone
  supabase/                  clients navigateur, serveur et admin
supabase/schema.sql          tables, RLS et données de départ
proxy.js                     rafraîchit la session, protège /compte
                             (ex-middleware.js, renommé dans Next 16)
```

---

## Note sur les versions

Le projet est sur Next 16 et React 19. Ne redescendez pas en Next 14 : cette
branche n'est plus corrigée et cumule des failles connues (SSRF, empoisonnement
de cache, contournement de middleware). `npm audit` doit afficher
`found 0 vulnerabilities`.

Spécificités Next 15+ déjà appliquées dans le code :
- `cookies()` est asynchrone → `createClient()` de `lib/supabase/server.js`
  est `async` et doit toujours être appelée avec `await`
- `params` et `searchParams` des pages sont des Promises → `await params`
- le fichier `middleware.js` s'appelle désormais `proxy.js`, et la fonction
  exportée s'appelle `proxy`

---

## Points de sécurité à ne pas casser

- `SUPABASE_SERVICE_ROLE_KEY` ne doit **jamais** apparaître dans un composant
  client ni dans une variable préfixée `NEXT_PUBLIC_`.
- L'écriture dans `subscriptions` est réservée au serveur. Le webhook Stripe est
  la seule source de vérité du statut : sans cela, un client pourrait se déclarer
  « actif » sans avoir payé.
- La route `/api/abonnement` vérifie que l'abonnement appartient bien à la
  personne connectée avant toute action.
- La signature du webhook est vérifiée. Sans cette vérification, n'importe qui
  pourrait appeler l'URL pour activer un abonnement.

---

## Vos photos

Trois images de remplacement sont dans `public/images/`. Substituez-les par vos
propres photos **en gardant les mêmes noms de fichier** :

| Fichier | Usage |
|---|---|
| `box-diabete.jpg` | carte de la box diabète, sur l'accueil |
| `box-antiinflam.jpg` | carte de la box anti-inflammatoire |
| `hero.jpg` | photo d'ambiance du bandeau vert foncé |

Format paysage 4/3, environ 1600 x 1200 px, moins de 400 Ko (compressez sur
squoosh.app). Voir `public/images/LISEZ-MOI.txt`.

N'utilisez que des photos dont vous détenez les droits. Les visuels d'un
concurrent ou trouvés via Google Images sont protégés par le droit d'auteur.

Pour les photos de recettes, qui changeront souvent, l'étape suivante est
Supabase Storage plutôt que `public/` — ainsi vous les gérez sans toucher au code.

---

## Reste à faire avant l'ouverture au public

- [ ] Remplacer les zones de livraison par vos vraies tournées
- [ ] Remplacer les trois photos de `public/images/`
- [ ] Renseigner le nom de la diététicienne dans `recipes.validated_by`
- [ ] Retirer `robots: { index: false }` dans `app/layout.js`
- [ ] Rédiger CGV, mentions légales, politique de confidentialité
- [ ] Faire valider les allégations santé (règlement UE 1924/2006)
- [ ] Ajouter un back-office de validation des recettes
- [ ] Génération automatique des commandes hebdomadaires (tâche planifiée)
- [ ] Emails transactionnels (Brevo) : confirmation, rappel de livraison
- [ ] Endpoint de suppression de compte (droit RGPD à l'effacement)
- [ ] Passer Stripe en mode Live et recréer le webhook
