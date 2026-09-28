-- =====================================================================
-- Healthy Box — schéma de base de données
-- À exécuter dans Supabase > SQL Editor sur un projet créé en région
-- EUROPE (Frankfurt ou Paris). Ce choix est IRRÉVERSIBLE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ZONES DE LIVRAISON (public, lecture seule)
-- ---------------------------------------------------------------------
create table if not exists delivery_zones (
  id             bigint generated always as identity primary key,
  -- nom de la tournée, affiché au client
  city           text not null unique,
  -- 1 = lundi ... 7 = dimanche (norme ISO)
  allowed_days   int[] not null,
  -- créneaux de livraison : générés de slot_start à slot_end, tous les
  -- slot_interval_minutes. slot_end est le DÉBUT du dernier créneau.
  slot_start           time not null default '11:00',
  slot_end             time not null default '18:00',
  slot_interval_minutes int not null default 30 check (slot_interval_minutes > 0),
  -- délai de préparation exprimé en JOURS OUVRÉS (samedi et dimanche exclus).
  -- Minimum 2 : on ne livre jamais le jour même ni le lendemain, il faut le
  -- temps de commander les ingrédients et de préparer les box.
  lead_time_days int not null default 3 check (lead_time_days >= 2),
  -- heure limite de commande, le jour de la date butoir
  cutoff_time    time not null default '20:00',
  -- nombre max de livraisons par jour sur cette zone (capacité tournée)
  daily_capacity int not null default 40,
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 1 bis. CODES POSTAUX
--    Un code postal couvre parfois plusieurs communes (20117 = Cauro,
--    Ocana et Eccica-Suarella). On stocke le libellé exact à afficher
--    quand le client saisit son code.
-- ---------------------------------------------------------------------
create table if not exists delivery_postal_codes (
  id          bigint generated always as identity primary key,
  postal_code text not null unique,
  -- communes couvertes par ce code, telles qu'affichées au client
  label       text not null,
  zone_id     bigint not null references delivery_zones(id) on delete cascade
);

create index if not exists idx_postal_zone on delivery_postal_codes(zone_id);

-- ---------------------------------------------------------------------
-- 2. RECETTES (public, lecture seule ; écriture réservée au back-office)
-- ---------------------------------------------------------------------
-- Deux formules uniquement : diabète et anti-inflammatoire.
create type box_category as enum ('diabete', 'antiinflam');

-- ---------------------------------------------------------------------
-- 2. RECETTES
--    Une recette existe dans LES DEUX box. Ce qui change d'une box à
--    l'autre, ce sont les ingrédients et les valeurs nutritionnelles :
--    c'est le rôle de la table recipe_variants.
-- ---------------------------------------------------------------------
create table if not exists recipes (
  id            bigint generated always as identity primary key,
  slug          text not null unique,
  name          text not null,
  description   text,
  -- chemin de la photo dans public/images/recettes/
  image         text,
  image_alt     text,
  prep_minutes  int,
  tags          text[] default '{}',
  -- traçabilité de la validation professionnelle
  validated_by  text,
  validated_at  timestamptz,
  published     boolean not null default false,
  position      int not null default 0,
  created_at    timestamptz not null default now()
);

-- Garde-fou : une recette ne peut être publiée que si elle a été validée.
alter table recipes add constraint recipes_published_requires_validation
  check (published = false or (validated_by is not null and validated_at is not null));

-- ---------------------------------------------------------------------
-- 2 bis. VARIANTES PAR BOX
--    Même plat, ingrédients adaptés : farine complète et féculent à index
--    bas côté diabète, oméga-3 et épices anti-inflammatoires de l'autre.
-- ---------------------------------------------------------------------
create table if not exists recipe_variants (
  id             bigint generated always as identity primary key,
  recipe_id      bigint not null references recipes(id) on delete cascade,
  category       box_category not null,
  ingredients    text[] not null default '{}',
  kcal           int,
  -- renseigné pour la variante diabète
  glycemic_index int,
  -- ce qui distingue cette variante, affiché au client
  highlight      text,
  unique (recipe_id, category)
);

create index if not exists idx_variants_recipe on recipe_variants(recipe_id);

-- ---------------------------------------------------------------------
-- 3. PROFILS CLIENTS
--    NOTE RGPD : on ne stocke AUCUNE donnée médicale ici.
--    La catégorie de box est une préférence de menu, pas un diagnostic.
-- ---------------------------------------------------------------------
create type user_role as enum ('client', 'admin');

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  -- Le rôle ne peut PAS être modifié depuis le navigateur : la politique
  -- de mise à jour ci-dessous l'interdit. On se nomme administrateur
  -- uniquement depuis l'éditeur SQL de Supabase.
  role        user_role not null default 'client',
  created_at  timestamptz not null default now()
);

-- Création automatique du profil à l'inscription
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------
-- 4. ADRESSES DE LIVRAISON
-- ---------------------------------------------------------------------
create table if not exists delivery_addresses (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  zone_id     bigint not null references delivery_zones(id),
  street      text not null,
  postal_code text not null,
  city        text,
  notes       text,
  created_at  timestamptz not null default now()
);
create index if not exists idx_addresses_user on delivery_addresses(user_id);

-- ---------------------------------------------------------------------
-- 5. ABONNEMENTS
-- ---------------------------------------------------------------------
create type subscription_status as enum ('active', 'suspended', 'cancelled', 'incomplete');
create type plan_kind as enum ('unite', 'm3', 'm6', 'm12');

create table if not exists subscriptions (
  id                     bigint generated always as identity primary key,
  user_id                uuid not null references auth.users(id) on delete cascade,
  box_category           box_category not null,
  plan                   plan_kind not null,
  people_count           int not null check (people_count between 1 and 8),
  meals_per_week         int not null check (meals_per_week between 2 and 7),
  address_id             bigint references delivery_addresses(id),
  -- jour de livraison récurrent (1 = lundi ... 7 = dimanche)
  delivery_weekday       int not null check (delivery_weekday between 1 and 7),
  -- créneau habituel, heure de début au format HH:MM (ex. '14:30')
  delivery_slot          text not null default '11:00',
  -- date de la toute première livraison
  first_delivery_date    date,
  -- sélection reconduite chaque semaine tant que le client ne la change pas.
  -- Un même identifiant peut apparaître plusieurs fois : doubler une recette
  -- que l'on aime est autorisé.
  recipe_ids             bigint[] not null default '{}',
  -- coordonnées saisies à la commande (pour la livraison et les relances)
  contact_email          text,
  contact_phone          text,
  -- consigne des contenants : facturée une seule fois, à la première commande
  deposit_paid           boolean not null default false,
  -- code promo appliqué à cet abonnement, le cas échéant.
  -- La clé étrangère est ajoutée plus bas, promo_codes étant créée après.
  promo_code_id          bigint,
  free_delivery          boolean not null default false,
  -- date d'envoi de la relance de panier abandonné (une seule par abonnement)
  abandoned_email_at     timestamptz,
  deposit_amount_cents   int not null default 0,
  status                 subscription_status not null default 'incomplete',
  -- Stripe
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  -- fin de la période d'engagement (null pour les box à l'unité)
  commitment_ends_at     timestamptz,
  started_at             timestamptz,
  cancelled_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists idx_subs_user on subscriptions(user_id);

-- ---------------------------------------------------------------------
-- 6. COMMANDES / LIVRAISONS
-- ---------------------------------------------------------------------
create type order_status as enum ('scheduled', 'preparing', 'shipped', 'delivered', 'skipped');

create table if not exists orders (
  id              bigint generated always as identity primary key,
  subscription_id bigint not null references subscriptions(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  delivery_date   date not null,
  status          order_status not null default 'scheduled',
  recipe_ids      bigint[] default '{}',
  -- date initialement prévue, renseignée quand le client déplace sa livraison
  rescheduled_from date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_date on orders(delivery_date);

-- Une seule livraison par abonnement et par date : rend la génération des
-- semaines à venir idempotente (on peut la relancer sans créer de doublons).
alter table orders add constraint orders_unique_per_date
  unique (subscription_id, delivery_date);

-- ---------------------------------------------------------------------
-- 7. RENDEZ-VOUS
--    Gérés par Calendly, hors de cette base : l'agenda, les confirmations
--    et les rappels sont assurés par le service. Aucune donnée de rendez-vous
--    n'est stockée ici, ce qui évite de conserver des informations liées à
--    la santé des clients.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 7 bis. CODES PROMO
--    Pour l'instant un seul effet : offrir les frais de livraison.
--    Le code est toujours revalidé côté serveur avant le paiement.
-- ---------------------------------------------------------------------
create type promo_effect as enum ('livraison_offerte');

create table if not exists promo_codes (
  id           bigint generated always as identity primary key,
  -- toujours stocké en MAJUSCULES, la comparaison se fait dessus
  code         text not null unique,
  effect       promo_effect not null default 'livraison_offerte',
  active       boolean not null default true,
  -- null = pas de limite
  max_uses     int,
  used_count   int not null default 0,
  expires_at   timestamptz,
  note         text,
  created_at   timestamptz not null default now()
);

-- Incrémentation atomique du compteur : deux paiements simultanés ne doivent
-- pas lire la même valeur et écrire le même total.
create or replace function increment_promo_usage(promo_id bigint)
returns void language sql security definer set search_path = public as $$
  update promo_codes set used_count = used_count + 1 where id = promo_id;
$$;

-- La contrainte ne peut être posée qu'ici : subscriptions est déclarée plus haut
alter table subscriptions
  drop constraint if exists subscriptions_promo_code_fk;
alter table subscriptions
  add constraint subscriptions_promo_code_fk
  foreign key (promo_code_id) references promo_codes(id) on delete set null;

-- Qui a utilisé quel code : évite qu'une même personne en profite deux fois
create table if not exists promo_redemptions (
  id              bigint generated always as identity primary key,
  promo_code_id   bigint not null references promo_codes(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  subscription_id bigint references subscriptions(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (promo_code_id, user_id)
);

-- ---------------------------------------------------------------------
-- 8. LISTE D'ATTENTE (communes non desservies)
--    Sert à savoir où étendre les tournées.
-- ---------------------------------------------------------------------
create table if not exists waitlist (
  id          bigint generated always as identity primary key,
  email       text not null,
  postal_code text not null,
  city        text,
  created_at  timestamptz not null default now(),
  unique (email, postal_code)
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- Sans ces règles, n'importe quel visiteur pourrait lire les données
-- de tous les clients avec la seule clé publique. C'est le point de
-- sécurité le plus important du projet.
-- =====================================================================

alter table delivery_zones      enable row level security;
alter table delivery_postal_codes enable row level security;
alter table recipes             enable row level security;
alter table recipe_variants     enable row level security;
alter table profiles            enable row level security;
alter table delivery_addresses  enable row level security;
alter table subscriptions       enable row level security;
alter table orders              enable row level security;
alter table waitlist            enable row level security;
alter table promo_codes         enable row level security;
alter table promo_redemptions   enable row level security;

-- Aucune politique de lecture sur promo_codes : la liste des codes ne doit
-- jamais être accessible au navigateur. Seul le serveur (service_role) y
-- accède, ce qui contourne RLS.

create policy "utilisations lisibles par leur propriétaire"
  on promo_redemptions for select using (auth.uid() = user_id);

-- Liste d'attente : tout le monde peut s'inscrire, personne ne peut la lire
-- depuis le navigateur (seul le back-office y accède via service_role).
create policy "inscription libre à la liste d'attente"
  on waitlist for insert with check (true);

-- Zones et recettes publiées : lisibles par tout le monde
create policy "zones lisibles publiquement"
  on delivery_zones for select using (active = true);

create policy "codes postaux lisibles publiquement"
  on delivery_postal_codes for select using (true);

create policy "recettes publiées lisibles publiquement"
  on recipes for select using (published = true);

create policy "variantes lisibles publiquement"
  on recipe_variants for select using (
    exists (select 1 from recipes r where r.id = recipe_id and r.published = true)
  );

-- Profil : chacun ne voit et ne modifie que le sien
create policy "profil lisible par son propriétaire"
  on profiles for select using (auth.uid() = id);
-- Mise à jour de son propre profil, sans pouvoir changer son rôle :
-- sans ce contrôle, n'importe quel client se déclarerait administrateur.
create policy "profil modifiable par son propriétaire"
  on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from profiles p where p.id = auth.uid())
  );

-- Adresses
create policy "adresses lisibles par leur propriétaire"
  on delivery_addresses for select using (auth.uid() = user_id);
create policy "adresses créées par leur propriétaire"
  on delivery_addresses for insert with check (auth.uid() = user_id);
create policy "adresses modifiables par leur propriétaire"
  on delivery_addresses for update using (auth.uid() = user_id);
create policy "adresses supprimables par leur propriétaire"
  on delivery_addresses for delete using (auth.uid() = user_id);

-- Abonnements : lecture seule côté client.
-- Toute écriture passe par les routes API serveur (service_role), pour
-- que personne ne puisse se déclarer "actif" sans être passé par Stripe.
create policy "abonnements lisibles par leur propriétaire"
  on subscriptions for select using (auth.uid() = user_id);

-- Commandes : lecture seule côté client
create policy "commandes lisibles par leur propriétaire"
  on orders for select using (auth.uid() = user_id);

-- Rendez-vous
-- =====================================================================
-- DONNÉES DE DÉPART
-- Zones : à remplacer par vos vraies tournées avant ouverture.
-- =====================================================================

insert into delivery_zones
  (city, allowed_days, slot_start, slot_end, slot_interval_minutes, lead_time_days)
values
  ('Ajaccio et périphérie',      '{1,2,3,4,5,6}', '12:00', '18:30', 30, 2),
  ('Golfe de Valinco et Taravo', '{2}',           '12:00', '18:00', 30, 3),
  ('Calcatoggio',                '{4}',           '12:00', '18:00', 30, 3)
on conflict (city) do nothing;

insert into delivery_postal_codes (postal_code, label, zone_id) values
  -- Ajaccio et périphérie
  ('20000', 'Ajaccio',                              (select id from delivery_zones where city = 'Ajaccio et périphérie')),
  ('20090', 'Ajaccio',                              (select id from delivery_zones where city = 'Ajaccio et périphérie')),
  ('20167', 'Afa, Alata, Sarrola-Carcopino',        (select id from delivery_zones where city = 'Ajaccio et périphérie')),
  ('20129', 'Bastelicaccia',                        (select id from delivery_zones where city = 'Ajaccio et périphérie')),
  ('20117', 'Cauro, Ocana, Eccica-Suarella',        (select id from delivery_zones where city = 'Ajaccio et périphérie')),
  ('20166', 'Porticcio, Pietrosella',               (select id from delivery_zones where city = 'Ajaccio et périphérie')),
  -- Golfe de Valinco et Taravo
  ('20128', 'Albitreccia, Grosseto-Prugna',         (select id from delivery_zones where city = 'Golfe de Valinco et Taravo')),
  ('20138', 'Coti-Chiavari, Portigliolo',           (select id from delivery_zones where city = 'Golfe de Valinco et Taravo')),
  ('20123', 'Pila-Canale',                          (select id from delivery_zones where city = 'Golfe de Valinco et Taravo')),
  ('20140', 'Petreto-Bicchisano, Porto-Pollo',      (select id from delivery_zones where city = 'Golfe de Valinco et Taravo')),
  ('20110', 'Propriano',                            (select id from delivery_zones where city = 'Golfe de Valinco et Taravo')),
  ('20113', 'Olmeto, Olmeto-Plage',                 (select id from delivery_zones where city = 'Golfe de Valinco et Taravo')),
  -- Calcatoggio
  ('20111', 'Calcatoggio',                          (select id from delivery_zones where city = 'Calcatoggio'))
on conflict (postal_code) do nothing;

insert into promo_codes (code, effect, note, max_uses) values
  ('LIVRAISONOFFERTE', 'livraison_offerte', 'Code de lancement, à distribuer manuellement', 100)
on conflict (code) do nothing;

insert into recipes (slug, name, description, image, image_alt, prep_minutes, tags, validated_by, validated_at, published, position) values
  ('champignons-farcis', 'Champignons farcis au chèvre, mâche et noix', 'Gros champignons de Paris garnis d''épinards et de noix, chèvre gratiné, mâche au balsamique.', '/images/recettes/champignons-farcis.jpg', 'Trois champignons farcis au chèvre gratiné, servis avec une mâche aux noix et au balsamique', 35, '{"végétarien"}'::text[], 'Naturopathe — à renseigner', now(), true, 1),
  ('fusilli-poulet-champignons', 'Fusilli complets, poulet et champignons à la crème', 'Pâtes complètes, émincé de poulet et champignons dans une crème légère au parmesan.', '/images/recettes/fusilli-poulet-champignons.jpg', 'Assiette de fusilli complets au poulet et aux champignons, sauce crémeuse au parmesan', 30, '{"volaille"}'::text[], 'Naturopathe — à renseigner', now(), true, 2),
  ('spaghetti-butternut', 'Spaghetti, crème de butternut et sauge', 'Sauce onctueuse de courge butternut rôtie, relevée à la sauge et au piment doux.', '/images/recettes/spaghetti-butternut.jpg', 'Assiette de spaghetti nappés d''une crème de butternut jaune, parsemée de piment doux', 35, '{"végétarien"}'::text[], 'Naturopathe — à renseigner', now(), true, 3),
  ('poulet-citron-patate-douce', 'Émincé de poulet au citron, patate douce et épinards', 'Poulet mariné aux herbes et citron, patate douce rôtie au four, épinards à l''ail.', '/images/recettes/poulet-citron-patate-douce.jpg', 'Assiette de patate douce rôtie, émincé de poulet au citron et épinards sautés', 40, '{"volaille","sans gluten"}'::text[], 'Naturopathe — à renseigner', now(), true, 4),
  ('wrap-complet', 'Wrap de blé complet, houmous et légumes croquants', 'Galette complète garnie de houmous maison, jeunes pousses d''épinards et rubans de carotte.', '/images/recettes/wrap-complet.jpg', 'Wrap de blé complet garni d''épinards frais et de rubans de carotte, sur une assiette verte', 20, '{"végétarien"}'::text[], 'Naturopathe — à renseigner', now(), true, 5),
  ('salade-epinards-pois-chiches', 'Salade d''épinards, pois chiches rôtis et noix', 'Jeunes pousses, pois chiches croustillants, dés de courgette et éclats de noix.', '/images/recettes/salade-epinards-pois-chiches.jpg', 'Salade de jeunes pousses d''épinards, pois chiches rôtis, dés de courgette et éclats de noix', 25, '{"végétarien"}'::text[], 'Naturopathe — à renseigner', now(), true, 6),
  ('galettes-courgette', 'Galettes de courgette et pomme de terre, mâche', 'Galettes dorées à la poêle, servies avec une mâche assaisonnée.', '/images/recettes/galettes-courgette.jpg', 'Galettes de légumes râpés dorées à la poêle, servies avec de la mâche', 30, '{"végétarien"}'::text[], 'Naturopathe — à renseigner', now(), true, 7),
  ('dorade-lentilles', 'Filet de dorade, lentilles corail au citron', 'Poisson blanc de Méditerranée et légumineuses fondantes au citron.', null, null, 30, '{"poisson","sans gluten"}'::text[], 'Naturopathe — à renseigner', now(), true, 8),
  ('saumon-curcuma', 'Saumon mariné curcuma-gingembre, brocolis vapeur', 'Pavé de saumon mariné aux épices, brocolis juste vapeur.', null, null, 30, '{"poisson","sans gluten"}'::text[], 'Naturopathe — à renseigner', now(), true, 9),
  ('veloute-brocolis', 'Velouté de brocolis, œuf mollet', 'Velouté léger et protéine douce, prêt en moins de 25 minutes.', null, null, 25, '{"végétarien"}'::text[], 'Naturopathe — à renseigner', now(), true, 10),
  ('saute-veau', 'Sauté de veau, haricots verts et patate douce', 'Viande maigre mijotée, haricots verts croquants.', null, null, 40, '{"viande"}'::text[], 'Naturopathe — à renseigner', now(), true, 11),
  ('truite-epinards', 'Truite grillée, épinards et riz complet', 'Poisson gras grillé, épinards à l''ail, riz complet.', null, null, 30, '{"poisson"}'::text[], 'Naturopathe — à renseigner', now(), true, 12),
  ('cabillaud-fenouil', 'Cabillaud au four, fenouil et boulgour', 'Poisson blanc et fenouil braisé, boulgour aux herbes.', null, null, 35, '{"poisson"}'::text[], 'Naturopathe — à renseigner', now(), true, 13),
  ('curry-legumes-coco', 'Curry de légumes verts au lait de coco', 'Brocolis et épinards mijotés dans un lait de coco épicé.', null, null, 30, '{"végétarien","sans gluten"}'::text[], 'Naturopathe — à renseigner', now(), true, 14),
  ('bowl-avocat-sardines', 'Bowl avocat, sardines et graines de lin', 'Petits poissons gras, avocat et bonnes graisses végétales.', null, null, 15, '{"poisson","sans gluten"}'::text[], 'Naturopathe — à renseigner', now(), true, 15)
on conflict (slug) do nothing;

insert into recipe_variants (recipe_id, category, ingredients, kcal, glycemic_index, highlight) values
  ((select id from recipes where slug = 'champignons-farcis'), 'diabete', '{"gros champignons de Paris","bûche de chèvre","épinards frais","cerneaux de noix","mâche","vinaigre balsamique","ail","thym"}'::text[], 430, 34, 'Peu de féculents, protéines et bonnes graisses'),
  ((select id from recipes where slug = 'champignons-farcis'), 'antiinflam', '{"gros champignons de Paris","bûche de chèvre","épinards frais","cerneaux de noix","mâche","huile de colza","ail","thym","curcuma"}'::text[], 450, null, 'Noix et huile de colza riches en oméga-3'),
  ((select id from recipes where slug = 'fusilli-poulet-champignons'), 'diabete', '{"fusilli complets","blanc de poulet","champignons de Paris","crème légère","parmesan","ail","persil"}'::text[], 520, 45, 'Pâtes complètes, index glycémique modéré'),
  ((select id from recipes where slug = 'fusilli-poulet-champignons'), 'antiinflam', '{"fusilli au sarrasin","blanc de poulet","champignons de Paris","crème davoine","levure maltée","ail","persil","curcuma"}'::text[], 500, null, 'Sans produits laitiers, sarrasin et curcuma'),
  ((select id from recipes where slug = 'spaghetti-butternut'), 'diabete', '{"spaghetti complets","courge butternut","oignon","sauge","piment doux","huile dolive","parmesan"}'::text[], 480, 48, 'Spaghetti complets et courge riche en fibres'),
  ((select id from recipes where slug = 'spaghetti-butternut'), 'antiinflam', '{"spaghetti de blé complet","courge butternut","oignon","sauge","curcuma","piment doux","huile dolive","graines de courge"}'::text[], 470, null, 'Courge et curcuma, sources d''antioxydants'),
  ((select id from recipes where slug = 'poulet-citron-patate-douce'), 'diabete', '{"blanc de poulet","patate douce","épinards frais","citron","persil plat","ail","huile dolive"}'::text[], 460, 44, 'Patate douce à index glycémique modéré'),
  ((select id from recipes where slug = 'poulet-citron-patate-douce'), 'antiinflam', '{"blanc de poulet","patate douce","épinards frais","citron","persil plat","ail","huile dolive","curcuma","gingembre"}'::text[], 470, null, 'Curcuma et gingembre frais'),
  ((select id from recipes where slug = 'wrap-complet'), 'diabete', '{"galettes de blé complet","pois chiches","tahini","jeunes pousses dépinards","carottes","citron","cumin"}'::text[], 410, 42, 'Galette complète et légumineuses'),
  ((select id from recipes where slug = 'wrap-complet'), 'antiinflam', '{"galettes de sarrasin","pois chiches","tahini","jeunes pousses dépinards","carottes","citron","curcuma","graines de lin"}'::text[], 420, null, 'Graines de lin et curcuma'),
  ((select id from recipes where slug = 'salade-epinards-pois-chiches'), 'diabete', '{"jeunes pousses dépinards","pois chiches","courgette","cerneaux de noix","persil","huile dolive","citron"}'::text[], 400, 33, 'Légumineuses à index glycémique bas'),
  ((select id from recipes where slug = 'salade-epinards-pois-chiches'), 'antiinflam', '{"jeunes pousses dépinards","pois chiches","courgette","cerneaux de noix","persil","huile de colza","citron","curcuma"}'::text[], 410, null, 'Noix et huile de colza, riches en oméga-3'),
  ((select id from recipes where slug = 'galettes-courgette'), 'diabete', '{"courgettes","pommes de terre à chair ferme","carotte","œuf","farine complète","mâche","huile dolive"}'::text[], 420, 46, 'Pommes de terre à chair ferme, IG plus bas'),
  ((select id from recipes where slug = 'galettes-courgette'), 'antiinflam', '{"courgettes","patate douce","carotte","œuf","farine de pois chiche","mâche","huile de colza","curcuma"}'::text[], 430, null, 'Farine de pois chiche et curcuma'),
  ((select id from recipes where slug = 'dorade-lentilles'), 'diabete', '{"filet de dorade","lentilles corail","citron","échalote","huile dolive","persil plat"}'::text[], 420, 32, 'Lentilles à index glycémique bas'),
  ((select id from recipes where slug = 'dorade-lentilles'), 'antiinflam', '{"filet de dorade","lentilles corail","citron","échalote","huile de colza","persil plat","curcuma","gingembre"}'::text[], 430, null, 'Curcuma et gingembre'),
  ((select id from recipes where slug = 'saumon-curcuma'), 'diabete', '{"pavé de saumon","brocolis","curcuma","gingembre","citron vert","huile dolive","riz complet"}'::text[], 470, 40, 'Riz complet en accompagnement'),
  ((select id from recipes where slug = 'saumon-curcuma'), 'antiinflam', '{"pavé de saumon","brocolis","curcuma frais","gingembre","citron vert","huile de colza","quinoa"}'::text[], 480, null, 'Saumon et colza, très riches en oméga-3'),
  ((select id from recipes where slug = 'veloute-brocolis'), 'diabete', '{"brocolis","œufs","oignon","bouillon de légumes","crème légère","muscade"}'::text[], 310, 28, 'Très peu de glucides'),
  ((select id from recipes where slug = 'veloute-brocolis'), 'antiinflam', '{"brocolis","œufs","oignon","bouillon de légumes","lait de coco","curcuma","muscade"}'::text[], 330, null, 'Lait de coco et curcuma'),
  ((select id from recipes where slug = 'saute-veau'), 'diabete', '{"sauté de veau","haricots verts","patate douce","oignon","romarin","huile dolive"}'::text[], 480, 45, 'Féculent à index glycémique modéré'),
  ((select id from recipes where slug = 'saute-veau'), 'antiinflam', '{"sauté de veau","haricots verts","patate douce","oignon","romarin","huile de colza","curcuma","gingembre"}'::text[], 490, null, 'Épices anti-inflammatoires'),
  ((select id from recipes where slug = 'truite-epinards'), 'diabete', '{"filet de truite","épinards frais","riz complet","ail","citron","huile dolive"}'::text[], 440, 40, 'Riz complet, fibres et satiété'),
  ((select id from recipes where slug = 'truite-epinards'), 'antiinflam', '{"filet de truite","épinards frais","quinoa","ail","citron","huile de colza","graines de lin"}'::text[], 450, null, 'Truite et lin, sources d''oméga-3'),
  ((select id from recipes where slug = 'cabillaud-fenouil'), 'diabete', '{"dos de cabillaud","fenouil","boulgour","citron","aneth","huile dolive"}'::text[], 430, 44, 'Boulgour, index glycémique modéré'),
  ((select id from recipes where slug = 'cabillaud-fenouil'), 'antiinflam', '{"dos de cabillaud","fenouil","quinoa","citron","aneth","huile de colza","curcuma"}'::text[], 440, null, 'Quinoa sans gluten et curcuma'),
  ((select id from recipes where slug = 'curry-legumes-coco'), 'diabete', '{"brocolis","épinards","lait de coco","curcuma","gingembre","riz basmati","coriandre"}'::text[], 410, 47, 'Riz basmati, IG plus bas que le riz blanc'),
  ((select id from recipes where slug = 'curry-legumes-coco'), 'antiinflam', '{"brocolis","épinards","lait de coco","curcuma frais","gingembre","quinoa","coriandre","graines de courge"}'::text[], 420, null, 'Curcuma frais et quinoa'),
  ((select id from recipes where slug = 'bowl-avocat-sardines'), 'diabete', '{"sardines","avocat","jeunes pousses","graines de lin","citron","huile dolive","riz complet"}'::text[], 440, 38, 'Riz complet et avocat rassasiants'),
  ((select id from recipes where slug = 'bowl-avocat-sardines'), 'antiinflam', '{"sardines","avocat","jeunes pousses","graines de lin","citron","huile de colza","quinoa"}'::text[], 450, null, 'Sardines et lin, très riches en oméga-3')
on conflict (recipe_id, category) do nothing;
