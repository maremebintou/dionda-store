/**
 * Mode « vitrine » : version publique en préparation.
 * Les visiteurs parcourent les produits, sans prix, sans panier, sans commande et sans administration.
 * Activé à la construction : `VITRINE=1 bun build.ts` (produit le dossier dist-vitrine/).
 */
declare const __DIONDA_VITRINE__: boolean | undefined;
export const VITRINE: boolean = typeof __DIONDA_VITRINE__ !== 'undefined' && __DIONDA_VITRINE__ === true;

export const VITRINE_MESSAGE = 'Boutique en préparation : découvrez nos produits, la commande en ligne arrive bientôt.';
