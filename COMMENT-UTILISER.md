# DIONDA STORE — Comment utiliser votre site

## 1. Voir le site (le plus simple)

Ouvrez le dossier **`dist-single`** et double-cliquez sur **`index.html`**.
Le site s'ouvre dans votre navigateur, avec les photos. Aucune installation n'est nécessaire.

> Gardez toujours le dossier `photos` à côté de `index.html` : c'est là que le site va chercher les images.

## 2. Ce que vous pouvez faire

**Côté client (la boutique)**
- Parcourir les produits par catégorie, rechercher, trier.
- Cliquer sur **Origine** ou **Vertus** pour voir la provenance et les usages de chaque produit.
- Choisir un format, ajouter au panier, passer une **commande de démonstration** (rien n'est payé ni livré).
- Découvrir les pages **Terroirs** et **Producteurs**.

**Côté gestion (l'administration)**
- En bas de page, cliquez sur **Espace administration** (ou ajoutez `#/admin` à l'adresse).
- Choisissez un rôle et entrez : la connexion est **simulée**, elle ne protège rien.
- Vous pouvez gérer : produits, catégories, origines, fournisseurs, stocks et lots, commandes, clients, livraisons, promotions et coffrets, paramètres.

## 3. Ajouter ou changer une photo

1. Mettez l'image dans **`dist-single/photos/`** (et dans `public/photos/` si vous travaillez sur le code).
   Nom en minuscules, sans accent ni espace, par exemple `bissap.jpg`.
2. Dans l'administration : **Produits › Modifier › Photo du produit**, écrivez le nom du fichier.
3. Rechargez la page.

Pour montrer **plusieurs photos** d'un même produit : **Produits › Modifier › Autres photos**, un nom de fichier par ligne. Elles apparaissent en vignettes sous la photo principale, sur la fiche du produit (exemple : Fonio, Café Touba).

Conseils : image carrée (environ 1200 × 1200 pixels), JPG, moins de 300 Ko, fond clair.
La liste des photos déjà associées se trouve dans `photos/LISEZ-MOI.txt`.

## 4. Ce qui a changé dans cette version

- **17 produits ont maintenant leur photo.**
- **5 nouveaux produits** créés à partir de vos photos : Akpi, Graines de fenugrec, Beurre de karité, Beurre de cacao, Graines de chia (prix provisoires, origine et vertus à compléter).
- Encore **sans photo** : les 2 objets d'artisanat et les 2 coffrets.
- Nouveau champ **Photo du produit** dans l'administration, avec aperçu.

## 5. Important à savoir

- C'est un **prototype** : prix, stocks, clients et commandes sont fictifs.
- Les données (modifications, commandes de test) restent **dans votre navigateur**. Sur un autre ordinateur ou navigateur, vous repartez des données de départ.
- Pour revenir aux données de départ : **Administration › Paramètres › Réinitialiser les données de démonstration**.
- Les origines et vertus marquées « non vérifiée » doivent être confirmées avec vos fournisseurs avant une vraie mise en ligne.

## Publier la version vitrine (site en préparation)

Le dossier **`dist-vitrine`** contient une version publique du site : les visiteurs **parcourent les produits** (photos, origine, vertus, terroirs), mais **sans prix, sans panier, sans commande et sans administration**. Un bandeau indique que la commande en ligne arrive bientôt.

Pour la publier sur **GitHub Pages** :
1. Créez un nouveau dépôt GitHub (par exemple `dionda-store`).
2. Envoyez-y **le contenu** du dossier `dist-vitrine` : le fichier `index.html` **et** le dossier `photos` (à la racine du dépôt).
3. Dans le dépôt : **Settings › Pages › Branch : main / (root) › Save**.
4. Après une minute, le site est en ligne à l'adresse indiquée par GitHub.

Gardez la version complète (`dist-single`, avec l'administration) **sur votre ordinateur uniquement**.

Développeurs : `VITRINE=1 bun build.ts` reconstruit `dist-vitrine/`, et `python3 tests/vitrine.py` le vérifie.

## 6. Pour aller plus loin (développeurs)

Les explications techniques (installation avec `npm`, architecture, passage au SaaS) sont dans **`README.md`**.
