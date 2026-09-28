-- =====================================================================
-- REMISE À ZÉRO — à exécuter AVANT schema.sql
--
-- ⚠️ Ce script SUPPRIME toutes les tables et toutes les données.
-- Il est prévu pour la phase de développement, quand il n'y a encore
-- aucun client réel. NE JAMAIS l'exécuter sur une base en production.
--
-- Les comptes utilisateurs (auth.users) ne sont PAS supprimés ici.
-- Pour repartir de zéro côté comptes : Authentication > Users, à la main.
-- =====================================================================

drop table if exists promo_redemptions cascade;
drop table if exists promo_codes       cascade;
drop table if exists waitlist          cascade;
drop table if exists appointments      cascade;
drop table if exists orders            cascade;
drop table if exists subscriptions     cascade;
drop table if exists delivery_addresses cascade;
drop table if exists delivery_postal_codes cascade;
drop table if exists delivery_zones    cascade;
drop table if exists recipe_variants   cascade;
drop table if exists recipes           cascade;
drop table if exists profiles          cascade;

drop type if exists promo_effect        cascade;
drop type if exists order_status        cascade;
drop type if exists plan_kind           cascade;
drop type if exists subscription_status cascade;
drop type if exists user_role           cascade;
drop type if exists box_category        cascade;

drop function if exists increment_promo_usage(bigint) cascade;
drop function if exists handle_new_user() cascade;
