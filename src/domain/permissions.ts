import type { Action, Permission, Resource, Role } from '../types';

export const RESOURCES: { id: Resource; label: string }[] = [
  { id: 'statistiques', label: 'Statistiques' },
  { id: 'catalogue', label: 'Produits & catégories' },
  { id: 'origines', label: 'Origines & régions' },
  { id: 'fournisseurs', label: 'Fournisseurs & producteurs' },
  { id: 'stocks', label: 'Stocks & lots' },
  { id: 'commandes', label: 'Commandes' },
  { id: 'clients', label: 'Clients' },
  { id: 'livraisons', label: 'Livraisons & zones' },
  { id: 'promotions', label: 'Promotions & coffrets' },
  { id: 'contenus', label: 'Contenus éditoriaux & nutrition' },
  { id: 'parametres', label: 'Paramètres' },
  { id: 'equipe', label: 'Équipe & rôles' },
  { id: 'boutiques', label: 'Boutiques & abonnement' },
];

export const ROLE_LABELS: Record<Role, string> = {
  proprietaire: 'Propriétaire',
  gestionnaire: 'Gestionnaire',
  logistique: 'Logistique',
  editeur: 'Éditeur de contenus',
  lecteur: 'Lecture seule',
};

const all = (actions: Action[]) => RESOURCES.flatMap((r) => actions.map((a) => `${r.id}:${a}` as Permission));
const some = (resources: Resource[], actions: Action[]) => resources.flatMap((r) => actions.map((a) => `${r}:${a}` as Permission));

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  proprietaire: all(['lire', 'ecrire']),
  gestionnaire: [
    ...all(['lire']).filter((p) => p !== 'boutiques:lire'),
    ...some(['catalogue', 'origines', 'fournisseurs', 'stocks', 'commandes', 'clients', 'livraisons', 'promotions', 'contenus'], ['ecrire']),
  ],
  logistique: [
    ...some(['statistiques', 'catalogue', 'stocks', 'commandes', 'clients', 'livraisons', 'fournisseurs'], ['lire']),
    ...some(['stocks', 'commandes', 'livraisons'], ['ecrire']),
  ],
  editeur: [
    ...some(['catalogue', 'origines', 'fournisseurs', 'contenus'], ['lire']),
    ...some(['catalogue', 'origines', 'fournisseurs', 'contenus'], ['ecrire']),
  ],
  lecteur: all(['lire']).filter((p) => !p.startsWith('equipe') && !p.startsWith('boutiques') && !p.startsWith('parametres')),
};

export function can(role: Role, resource: Resource, action: Action = 'lire'): boolean {
  return ROLE_PERMISSIONS[role].includes(`${resource}:${action}`);
}
