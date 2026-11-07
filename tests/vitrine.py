"""Vérifie la version vitrine : `VITRINE=1 bun build.ts` puis `python3 tests/vitrine.py`."""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

URL = 'file://' + str((Path(__file__).resolve().parent.parent / 'dist-vitrine' / 'index.html'))

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_context(viewport={'width': 1280, 'height': 800}).new_page()
    errors = []
    pg.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    ok = True

    def check(cond, label):
        global ok
        print(('  ✔ ' if cond else '  ✘ ') + label)
        ok = ok and cond

    pg.goto(URL + '#/boutique'); pg.wait_for_selector('.pcard'); pg.wait_for_timeout(500)
    check(pg.locator('.pcard').count() > 20, 'le catalogue est visible')
    check('FCFA' not in pg.inner_text('body'), 'aucun prix affiché')
    check(pg.locator('.cart-btn').count() == 0 and pg.get_by_text('Ajouter').count() == 0, 'ni panier ni bouton Ajouter')
    check(pg.locator('a[href*="admin"]').count() == 0, 'aucun lien vers l’administration')
    check(pg.get_by_text('En stock uniquement').count() == 0, 'pas de filtre de stock')
    for route in ('#/admin', '#/admin/produits', '#/commande'):
        pg.goto(URL + route); pg.wait_for_timeout(300)
        check(pg.locator('.admin-side').count() == 0 and "n'existe pas" in pg.inner_text('main'), f'{route} inaccessible')
    pg.goto(URL + '#/produit/fonio'); pg.wait_for_selector('.pdp'); pg.wait_for_timeout(300)
    check('commande en ligne arrive bientôt' in pg.inner_text('main'), 'fiche produit : message « bientôt »')
    check('FCFA' not in pg.inner_text('body'), 'fiche produit sans prix')
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.goto(URL + '#/'); pg.wait_for_timeout(300)
    check(not pg.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), 'mobile sans débordement')
    check(not errors, 'aucune erreur console')
    b.close()
    sys.exit(0 if ok else 1)
