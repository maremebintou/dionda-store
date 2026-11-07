import type { FCFA, VerificationStatus } from '../types';

const fcfaFormatter = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

/** 12500 -> "12 500 FCFA" (espaces normalisées). */
export function formatFCFA(amount: FCFA): string {
  return `${fcfaFormatter.format(Math.round(amount)).replace(/\s/g, ' ')} FCFA`;
}

export function formatDate(iso?: string, withTime = false): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  non_renseigne: 'Non renseigné',
  a_verifier: 'Information non vérifiée',
  declare_fournisseur: 'Déclaré par le fournisseur',
  verifie: 'Vérifié par DIONDA STORE',
};

export const VERIFICATION_HELP: Record<VerificationStatus, string> = {
  non_renseigne: "Aucune information n'a encore été saisie pour cette rubrique.",
  a_verifier: "Ces informations ont été saisies mais n'ont pas encore été contrôlées. Elles sont données à titre indicatif.",
  declare_fournisseur: "Informations transmises par le producteur ou le fournisseur, non contrôlées par DIONDA STORE.",
  verifie: 'Informations contrôlées par notre équipe à partir des sources indiquées.',
};

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n > 1 ? pluralForm : singular}`;
}
