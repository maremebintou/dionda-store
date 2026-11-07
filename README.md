# DIONDA STORE

> *L'authenticité de nos terroirs, l'élégance du naturel.*

Boutique e-commerce premium de produits du terroir sénégalais et ouest-africain : **prototype frontend** (React + TypeScript), organisé pour évoluer vers un **SaaS** (API NestJS, PostgreSQL, multi-boutiques).

Interface entièrement en français, prix en FCFA. **Aucune commande réelle, aucun paiement, aucune protection des données** dans cette phase : tout est stocké dans le navigateur.

---

## Démarrer

**Sans installation** : ouvrez `dist-single/index.html` dans un navigateur (fichier autonome).

**En développement (Vite)** :

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # vérifie les types puis construit dist/
```

Après `npm install`, supprimez le dossier `shims/` et retirez `"shims"` de `tsconfig.json` : il remplace provisoirement `@types/react`, qui n'a pas pu être installé lors de la création du prototype. Le prototype a été construit et testé avec Bun ; la configuration Vite est standard mais n'a pas pu être exécutée dans cet environnement.

**Avec Bun** : `bun build.ts` (construit `dist/` et `dist-single/`), `VITRINE=1 bun build.ts` (version publique sans prix, panier, commande ni administration, dans `dist-vitrine/`), `bun test` (tests unitaires), `python3 tests/vitrine.py` (vérifie la vitrine).

**Tests navigateur** (Python + Playwright) : `python3 tests/e2e.py` après une construction.

**Administration** : `#/admin`, connexion simulée (choisir un rôle).

---

## Ajouter vos photos

Déposez vos images dans **`public/photos/`** (ou `photos/` à côté de `index.html` dans `dist-single/` et `dist/`), nommées comme le produit : `fonio.jpg`, `bissap.jpg`, `netetou.jpg`… La liste complète des noms attendus est dans `public/photos/LISEZ-MOI.txt`.

- La photo remplace automatiquement l'illustration ; sans photo, l'illustration reste affichée (pas d'image cassée).
- Autre nom de fichier, format `.png` / `.webp` ou image en ligne (`https://…`) : *Administration > Produits > Modifier > Photo du produit*.
- Conseils : carré (≈ 1200 × 1200 px), JPG, moins de 300 Ko, fond clair et uni.
- Après `bun build.ts` ou `npm run build`, le dossier est recopié automatiquement.

---

## Fonctionnalités

### Boutique
- Accueil (slogan, valeurs, catégories, sélection, coffrets, terroirs), catalogue avec filtres (catégorie, terroir, stock), recherche insensible aux accents, tri.
- Fiche produit : choix du format, quantité limitée au stock vendable, onglets Description / Origine / Vertus / Conservation.
- Boutons **Origine** et **Vertus** sur chaque carte et chaque fiche : fenêtre modale accessible (`<dialog>` natif, onglets au clavier, Échap, retour du focus), responsive.
- Chaque rubrique affiche son **niveau de vérification** : *Non renseigné*, *Information non vérifiée*, *Déclaré par le fournisseur*, *Vérifié par DIONDA STORE*. Les champs vides indiquent « Non renseigné ».
- Panier latéral, coffrets, commande de démonstration (validation des champs, zones et frais de livraison, codes promo), page de confirmation.
- Pages Terroirs et Producteurs, catégorie **Artisanat & textiles** distincte.

### Administration (`#/admin`)
| Module | Contenu |
|---|---|
| Tableau de bord | CA, commandes, panier moyen, CA par jour (7/14/30 j), ventes par catégorie, meilleures ventes, alertes |
| Produits | Général, formats & prix, origine, vertus (nutrition, bienfaits, usages, conseils, précautions, sources), traçabilité |
| Catégories | Création, ordre, visibilité, type (alimentaire / artisanat) |
| Origines & régions | Terroirs, pays, statut de vérification, sources |
| Fournisseurs & producteurs | Identité, région, présentation publique, contact interne |
| Contenus & nutrition | Complétude des fiches Origine / Vertus |
| Stocks & lots | Niveaux par format, réception de lots (n°, fournisseur, dates de production et limite, conservation), mouvements (entrée, sortie, ajustement, retour, perte), alertes de péremption |
| Commandes | Statuts, lots prélevés (FEFO), historique, annulation avec remise en stock |
| Clients | Fiches, nombre de commandes, montant cumulé |
| Livraisons & zones | Suivi (statut, date, livreur), zones, frais, seuil de gratuité, délais |
| Promotions & coffrets | Codes (%, montant, livraison offerte, minimum, période, limite), coffrets composés |
| Paramètres | Identité, contact, couleurs, mentions, export JSON, réinitialisation |
| Équipe & rôles | 5 rôles, matrice de permissions, changement de rôle pour tester |
| Boutiques & abonnement | Création de boutiques isolées, bascule entre boutiques |

Garde-fous : impossible de supprimer un produit vendu, un lot tracé, une catégorie non vide, une zone utilisée ; une rubrique ne peut pas passer « Vérifié » sans source ; une sortie de stock ne peut pas dépasser le stock ; les lots périmés sont exclus de la vente.

---

## Règles éditoriales du catalogue de démonstration

- Origines renseignées **uniquement** quand le nom du produit les indique (Kédougou, Ziguinchor, Kaolack, Mali), au statut « à vérifier ».
- **Aucune** valeur nutritionnelle, aucun bienfait santé, aucune certification n'a été saisi.
- Les usages culinaires courants et les allergènes évidents (arachide, sésame, poisson) sont marqués « non vérifiés ».
- *Toufa* et *Yokoss* : fiches à compléter (aucune description inventée).
- Prix, stocks, zones, clients, commandes, producteurs et produits artisanaux sont **fictifs** ou des **exemples**.

---

## Architecture

```
src/
  types/            Types du domaine (entités rattachées à shopId), DTO API, SaaS (Shop, Plan, Subscription, Role, Permission)
  domain/           Logique pure et testée : prix, promotions, stock, FEFO, permissions, formatage FCFA
  services/
    contracts.ts    Interfaces : Repository<T>, OrderService, InventoryService, AuthService, ShopService, MediaService, PaymentService
    local/          Implémentation navigateur (localStorage, partitionnée par boutique) + données de démo
    http/           Client HTTP prévu pour l'API NestJS (non branché, non testé contre un serveur)
  app/              Choix de l'implémentation (services.ts) et hooks
  store/            Contexte catalogue et panier
  ui/               Composants accessibles : Dialog, Tabs, visuels générés, icônes, notifications
  storefront/       Pages de la boutique
  admin/            Cadre d'administration, gestionnaire générique d'entités, modules
  data/seed.ts      Catalogue de démonstration
tests/              Tests unitaires (bun) et de bout en bout (Playwright)
```

Les écrans ne dépendent que des **contrats de services**. Passer à l'API consiste à fournir une implémentation HTTP de `Services` dans `src/app/services.ts`.

---

## Passer du prototype au SaaS

1. **API NestJS** : modules par ressource reprenant `src/types` ; routes `/api/shops/:shopId/<collection>` (voir `services/http`).
2. **PostgreSQL** : une table par entité, `shop_id` sur chaque ligne + sécurité au niveau des lignes (RLS) ; montants en entiers (FCFA) ; transactions pour commande + mouvements de stock ; verrouillage du stock (réservations).
3. **Authentification réelle** : mots de passe hachés (argon2), jetons courts + rafraîchissement en cookie httpOnly, 2FA pour les administrateurs, invitations, journal d'audit. Les permissions de `domain/permissions.ts` doivent être **appliquées côté serveur** (gardes NestJS).
4. **Stockage des images** : S3 / Cloudinary via URL pré-signées, redimensionnement ; remplace les visuels générés.
5. **Paiement en ligne** : prestataire agréé (mobile money Wave / Orange Money, carte), webhooks signés, idempotence ; aucune donnée bancaire côté frontend.
6. **Commandes et livraisons réelles** : notifications SMS / WhatsApp / e-mail, bons de livraison, suivi livreur, factures.
7. **Abonnements SaaS** : formules, limites (produits, administrateurs), facturation récurrente, domaines personnalisés, thèmes par boutique.
8. **Conformité** : mentions légales, CGV, politique de confidentialité (loi sénégalaise sur les données personnelles, CDP), réglementation de l'étiquetage alimentaire et des allégations nutritionnelles ; vérification des origines et des informations produit avec les fournisseurs.
9. **Qualité** : audit d'accessibilité automatisé (axe), tests d'intégration API, CI, monitoring.
