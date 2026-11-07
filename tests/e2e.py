"""Tests de bout en bout DIONDA STORE (Playwright, Chromium).
Usage : python3 tests/e2e.py [chemin vers dist-single/index.html]
"""
import re
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parent.parent
URL = 'file://' + str(Path(sys.argv[1] if len(sys.argv) > 1 else ROOT / 'dist-single' / 'index.html').resolve())
SHOTS = ROOT / 'tests' / 'screenshots'
SHOTS.mkdir(parents=True, exist_ok=True)
results = []


def step(name):
    def deco(fn):
        def run(page):
            try:
                fn(page)
                results.append((name, 'OK', ''))
                print(f'  ✔ {name}')
            except Exception as e:  # noqa
                results.append((name, 'ÉCHEC', str(e).splitlines()[0][:300]))
                print(f'  ✘ {name}\n      {str(e).splitlines()[0][:300]}')
                page.screenshot(path=str(SHOTS / f'echec-{len(results)}.png'))
        return run
    return deco


def go(page, route):
    page.goto(URL + '#' + route)
    page.wait_for_timeout(250)


@step('Accueil : rendu, slogan, sélection, sans erreur console')
def t_home(page):
    go(page, '/')
    expect(page.get_by_role('heading', level=1)).to_contain_text("L'authenticité de nos terroirs")
    expect(page.locator('.pcard').first).to_be_visible()
    page.screenshot(path=str(SHOTS / '01-accueil.png'), full_page=True)


@step('Catalogue : 19 produits, filtre artisanat distinct, recherche')
def t_catalog(page):
    go(page, '/boutique')
    expect(page.locator('.pcard')).to_have_count(27)
    page.get_by_role('button', name=re.compile('^Artisanat & textiles')).click()
    expect(page.locator('.pcard')).to_have_count(2)
    expect(page.locator('.ribbon').first).to_have_text('Exemple')
    go(page, '/boutique?q=fonio')
    expect(page.locator('.pcard')).to_have_count(1)
    go(page, '/boutique?q=netetou')  # recherche insensible aux accents
    expect(page.locator('.pcard')).to_have_count(1)
    go(page, '/boutique')
    page.screenshot(path=str(SHOTS / '02-catalogue.png'), full_page=False)


@step('Bouton Origine : fenêtre accessible, onglets au clavier, Échap, retour du focus')
def t_origin_dialog(page):
    go(page, '/boutique?q=huile')
    btn = page.locator('.pcard').first.get_by_role('button', name='Origine')
    btn.click()
    dlg = page.get_by_role('dialog')
    expect(dlg).to_be_visible()
    expect(dlg.get_by_role('tab', name='Origine')).to_have_attribute('aria-selected', 'true')
    expect(dlg).to_contain_text('Sénégal')
    expect(dlg).to_contain_text('Ziguinchor')
    expect(dlg).to_contain_text('Information non vérifiée')
    expect(dlg).not_to_contain_text('Vérifié par DIONDA STORE')
    page.screenshot(path=str(SHOTS / '03-fenetre-origine.png'))
    dlg.get_by_role('tab', name='Origine').focus()
    page.keyboard.press('ArrowRight')
    expect(dlg.get_by_role('tab', name='Vertus')).to_have_attribute('aria-selected', 'true')
    expect(dlg).to_contain_text("Aucune valeur nutritionnelle n'est disponible")
    page.screenshot(path=str(SHOTS / '04-fenetre-vertus.png'))
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).to_have_count(0)
    assert page.evaluate("document.activeElement && document.activeElement.textContent.includes('Origine')"), 'focus non restitué'


@step('Vertus : précautions allergènes et absence de bienfaits inventés')
def t_virtues(page):
    go(page, '/produit/pate-d-arachide')
    page.get_by_role('button', name='Vertus').first.click()
    dlg = page.get_by_role('dialog')
    expect(dlg).to_contain_text("Contient de l’arachide")
    expect(dlg).to_contain_text('Aucun bienfait documenté')
    page.keyboard.press('Escape')


@step('Fiche produit : choix du format, quantité, ajout au panier')
def t_product(page):
    go(page, '/produit/huile-de-palme-de-ziguinchor')
    expect(page.locator('.pdp-origin')).to_contain_text('Ziguinchor')
    page.locator('.format-opt', has_text='Bouteille 50 cl').click()
    expect(page.locator('.price-lg')).to_contain_text('1')
    page.get_by_role('button', name='Augmenter la quantité').click()
    expect(page.locator('.price-lg')).to_have_text(re.compile(r'3\s?000\s?FCFA'))
    page.get_by_role('button', name='Ajouter au panier').click()
    expect(page.locator('.cart-count')).to_have_text('2')
    page.get_by_role('tab', name='Conservation').click()
    expect(page.locator('.pdp-tabs .tabpanel')).to_contain_text('Conserver')
    page.screenshot(path=str(SHOTS / '05-fiche-produit.png'), full_page=True)


@step('Coffrets + panier latéral')
def t_bundles(page):
    go(page, '/coffrets')
    page.locator('.bcard', has_text='Coffret Petit-déjeuner').get_by_role('button', name='Ajouter').click()
    expect(page.locator('.cart-count')).to_have_text('3')
    page.get_by_role('button', name=re.compile('Ouvrir le panier')).click()
    dlg = page.get_by_role('dialog', name='Votre panier')
    expect(dlg.locator('.cart-line')).to_have_count(2)
    page.screenshot(path=str(SHOTS / '06-panier.png'))
    dlg.get_by_role('button', name='Passer la commande').click()
    expect(page.get_by_role('heading', name='Finaliser ma commande')).to_be_visible()


@step('Commande de démonstration : validations, code promo, confirmation')
def t_checkout(page):
    page.get_by_role('button', name='Valider la commande de démonstration').click()
    expect(page.locator('#co-firstName-err')).to_be_visible()
    page.fill('#co-promo', 'BIENVENUE10')
    page.get_by_role('button', name='Appliquer').click()
    expect(page.locator('.checkout-side')).to_contain_text("minimum d'achat")
    page.fill('#co-promo', 'TERROIR2000')  # min 15 000 : non atteint non plus
    page.fill('#co-promo', '')
    page.get_by_role('button', name='Appliquer').click()
    page.fill('#co-firstName', 'Mareme')
    page.fill('#co-lastName', 'Test')
    page.fill('#co-phone', '77 123 45 67')
    page.fill('#co-address', 'Rue de test')
    page.fill('#co-city', 'Dakar')
    page.select_option('#co-zone', 'zone_dakar')
    expect(page.locator('.checkout-side')).to_contain_text('Livraison')
    # 3 000 + 4 500 + 1 500 livraison = 9 000
    expect(page.locator('.checkout-side .sum-strong')).to_contain_text(re.compile(r'9\s?000'))
    page.screenshot(path=str(SHOTS / '07-commande.png'), full_page=True)
    page.get_by_role('button', name='Valider la commande de démonstration').click()
    expect(page.get_by_role('heading', level=1)).to_contain_text('Merci Mareme')
    expect(page.locator('.page')).to_contain_text('DS-2026-00012')
    expect(page.locator('.cart-count')).to_have_count(0)
    page.screenshot(path=str(SHOTS / '08-confirmation.png'), full_page=True)


@step('Terroirs et producteurs')
def t_terroirs(page):
    go(page, '/terroirs')
    for r in ['Kédougou', 'Ziguinchor', 'Kaolack', 'Mali']:
        expect(page.locator('.terroir-name', has_text=r)).to_be_visible()
    expect(page.locator('.terroirs')).to_contain_text('Provenance à préciser')
    page.screenshot(path=str(SHOTS / '09-terroirs.png'), full_page=False)
    go(page, '/producteurs')
    expect(page.locator('.producer')).to_have_count(3)


@step('Administration : connexion simulée signalée, tableau de bord')
def t_admin_login(page):
    go(page, '/admin')
    expect(page.locator('.login')).to_contain_text('Connexion simulée')
    page.get_by_role('button', name='Entrer dans l’administration').click()
    expect(page.locator('.sim-banner')).to_contain_text('aucune protection réelle')
    expect(page.get_by_role('heading', name='Tableau de bord')).to_be_visible()
    expect(page.locator('.kpi').nth(1)).to_contain_text('11')  # 10 valides sur 14 j + la nouvelle
    page.locator('.bar-g').nth(13).hover()
    expect(page.locator('.tooltip')).to_be_visible()
    page.screenshot(path=str(SHOTS / '10-admin-tableau-de-bord.png'), full_page=True)


@step('Commandes : nouvelle commande visible, lots tracés, changement de statut')
def t_admin_orders(page):
    go(page, '/admin/commandes')
    row = page.locator('tr', has_text='DS-2026-00012')
    expect(row).to_contain_text('En attente')
    row.get_by_role('button', name=re.compile('Ouvrir la commande')).click()
    dlg = page.get_by_role('dialog')
    expect(dlg.locator('.lot-chip').first).to_contain_text('L-DEMO')
    dlg.get_by_role('button', name='Passer à « Confirmée »').click()
    expect(dlg.locator('.order-box').first).to_contain_text('Confirmée')
    page.screenshot(path=str(SHOTS / '11-admin-commande.png'))
    page.keyboard.press('Escape')
    expect(page.locator('tr', has_text='DS-2026-00012')).to_contain_text('Confirmée')


@step('Annulation : le stock est réintégré')
def t_cancel(page):
    go(page, '/admin/stocks')
    row = page.locator('tr', has_text='Huile de palme de Ziguinchor').filter(has_text='Bouteille 50 cl')
    before = int(row.locator('td').nth(2).inner_text())
    go(page, '/admin/commandes')
    page.locator('tr', has_text='DS-2026-00012').get_by_role('button', name=re.compile('Ouvrir')).click()
    dlg = page.get_by_role('dialog')
    dlg.get_by_role('button', name='Annuler la commande').click()
    dlg.get_by_role('button', name='Oui, annuler').click()
    expect(dlg.locator('.order-box').first).to_contain_text('Annulée')
    page.keyboard.press('Escape')
    go(page, '/admin/stocks')
    row = page.locator('tr', has_text='Huile de palme de Ziguinchor').filter(has_text='Bouteille 50 cl')
    after = int(row.locator('td').nth(2).inner_text())
    assert after == before + 2, f'stock {before} -> {after}'


@step('Catégories : création d’une catégorie visible en boutique')
def t_admin_category(page):
    go(page, '/admin/categories')
    page.get_by_role('button', name='Ajouter').click()
    dlg = page.get_by_role('dialog')
    dlg.get_by_role('button', name='Enregistrer').click()
    expect(dlg).to_contain_text('Champ obligatoire')
    dlg.get_by_role('textbox', name='Nom', exact=True).fill('Épices & aromates')
    dlg.get_by_role('button', name='Enregistrer').click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(page.locator('tr', has_text='Épices & aromates')).to_be_visible()


@step('Produits : création complète (formats, origine, vertus) puis publication')
def t_admin_product(page):
    go(page, '/admin/produits')
    page.get_by_role('button', name='Ajouter').click()
    dlg = page.get_by_role('dialog')
    dlg.get_by_role('button', name='Enregistrer').click()
    expect(dlg.locator('.tab-error').first).to_be_visible()
    dlg.get_by_label('Nom du produit').fill('Kani (piment) test')
    dlg.get_by_label('Catégorie').select_option(label='Épices & aromates')
    dlg.get_by_label('Statut de publication').select_option('publie')
    dlg.get_by_label('Accroche').fill('Produit créé par le test automatique.')
    dlg.get_by_role('tab', name='Formats & prix').click()
    dlg.get_by_label('Libellé du format').fill('Sachet 100 g')
    dlg.get_by_label('Prix en FCFA', exact=True).fill('800')
    dlg.get_by_role('tab', name='Origine').click()
    dlg.get_by_label('Pays d’origine').fill('Sénégal')
    dlg.get_by_label('Statut de vérification').select_option('declare_fournisseur')
    dlg.get_by_role('tab', name='Vertus').click()
    dlg.get_by_label('Statut de vérification').select_option('verifie')
    dlg.get_by_role('button', name='Ajouter une valeur').click()
    dlg.get_by_label('Nutriment').fill('Énergie')
    dlg.get_by_label('Quantité', exact=True).fill('300')
    dlg.get_by_label('Unité', exact=True).fill('kcal')
    dlg.get_by_role('button', name='Enregistrer').click()
    expect(dlg).to_contain_text('doit citer au moins une source')
    dlg.get_by_role('button', name='Ajouter une source').click()
    dlg.get_by_label('Source 1 : intitulé').fill('Analyse de laboratoire (test)')
    page.screenshot(path=str(SHOTS / '12-admin-produit-vertus.png'))
    dlg.get_by_role('button', name='Enregistrer').click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    expect(page.locator('tr', has_text='Kani (piment) test')).to_contain_text('Publié')


@step('Stocks : réception d’un lot avec date limite, produit disponible en boutique')
def t_admin_lot(page):
    go(page, '/boutique?q=kani')
    expect(page.locator('.pcard')).to_have_count(1)
    expect(page.locator('.pcard')).to_contain_text('Rupture de stock')
    go(page, '/admin/stocks')
    page.get_by_role('button', name='Réceptionner un lot').click()
    dlg = page.get_by_role('dialog')
    dlg.get_by_label('Produit et format').select_option(label='Kani (piment) test — Sachet 100 g')
    dlg.get_by_label('Numéro de lot').fill('L-TEST-001')
    dlg.get_by_label('Quantité reçue (unités)').fill('25')
    dlg.get_by_label('Date limite (DLC / DDM)').fill('2027-06-30')
    dlg.get_by_role('button', name='Enregistrer la réception').click()
    expect(page.get_by_role('dialog')).to_have_count(0)
    page.get_by_role('tab', name='Lots & péremption').click()
    expect(page.locator('tr', has_text='L-TEST-001')).to_contain_text('25')
    page.screenshot(path=str(SHOTS / '13-admin-lots.png'), full_page=True)
    page.get_by_role('tab', name='Mouvements').click()
    expect(page.locator('tr', has_text='Réception du lot L-TEST-001')).to_contain_text('+25')
    go(page, '/produit/kani-piment-test')
    expect(page.locator('.pdp')).to_contain_text('En stock')
    page.get_by_role('button', name='Vertus').first.click()
    expect(page.get_by_role('dialog')).to_contain_text('Vérifié par DIONDA STORE')
    expect(page.get_by_role('dialog')).to_contain_text('300 kcal')
    page.keyboard.press('Escape')


@step('Mouvement : une sortie supérieure au stock est refusée')
def t_admin_movement(page):
    go(page, '/admin/stocks')
    page.get_by_role('button', name='Mouvement', exact=True).first.click()
    dlg = page.get_by_role('dialog')
    dlg.get_by_label('Produit et format').select_option(label='Kani (piment) test — Sachet 100 g')
    dlg.get_by_label('Type de mouvement').select_option('perte')
    dlg.get_by_role('spinbutton', name='Quantité', exact=True).fill('99')
    dlg.get_by_label('Motif').fill('Test')
    dlg.get_by_role('button', name='Enregistrer').click()
    expect(dlg).to_contain_text('Stock insuffisant')
    dlg.get_by_role('spinbutton', name='Quantité', exact=True).fill('3')
    dlg.get_by_role('button', name='Enregistrer').click()
    expect(page.get_by_role('dialog')).to_have_count(0)


@step('Suppression protégée : un produit vendu ne peut pas être supprimé')
def t_delete_guard(page):
    go(page, '/admin/produits')
    page.get_by_role('button', name='Supprimer Bissap rouge').click()
    expect(page.get_by_role('dialog')).to_contain_text('Archivé')
    expect(page.get_by_role('button', name='Supprimer définitivement')).to_have_count(0)
    page.keyboard.press('Escape')


@step('Autres modules : contenus, origines, fournisseurs, clients, livraisons, promotions, paramètres')
def t_admin_modules(page):
    for route, heading in [('/admin/contenus', 'Contenus éditoriaux'), ('/admin/origines', 'Origines & régions'), ('/admin/fournisseurs', 'Fournisseurs & producteurs'), ('/admin/clients', 'Clients'), ('/admin/livraisons', 'Livraisons & zones'), ('/admin/promotions', 'Promotions & coffrets'), ('/admin/parametres', 'Paramètres'), ('/admin/equipe', 'Équipe'), ('/admin/boutiques', 'Boutiques')]:
        go(page, route)
        expect(page.get_by_role('heading', level=1)).to_contain_text(heading)
    go(page, '/admin/contenus')
    page.screenshot(path=str(SHOTS / '14-admin-contenus.png'), full_page=True)
    go(page, '/admin/livraisons')
    page.get_by_role('tab', name='Zones desservies').click()
    expect(page.locator('tr', has_text='Dakar — centre')).to_be_visible()
    go(page, '/admin/promotions')
    expect(page.locator('tr', has_text='BIENVENUE10')).to_contain_text('Utilisable')


@step('Paramètres : le slogan modifié apparaît dans la boutique')
def t_settings(page):
    go(page, '/admin/parametres')
    page.get_by_label('Bandeau d’annonce').fill('Annonce modifiée par le test')
    page.get_by_role('button', name='Enregistrer').click()
    go(page, '/')
    expect(page.locator('.announce')).to_have_text('Annonce modifiée par le test')


@step('Rôles : l’éditeur ne voit ni commandes ni stocks')
def t_roles(page):
    go(page, '/admin/equipe')
    page.get_by_role('button', name='Éditeur de contenus').click()
    expect(page.locator('.admin-side')).not_to_contain_text('Commandes')
    go(page, '/admin/commandes')
    expect(page.locator('.admin-main')).to_contain_text('Accès non autorisé')
    go(page, '/admin/produits')
    expect(page.get_by_role('button', name='Ajouter')).to_be_visible()
    go(page, '/admin')
    page.wait_for_timeout(300)
    assert '/admin/produits' in page.url, page.url
    go(page, '/admin/equipe')
    expect(page.locator('.admin-main')).to_contain_text('Accès non autorisé')
    # retour propriétaire via la connexion
    page.get_by_role('button', name='Se déconnecter').click()
    page.get_by_label('Rôle à simuler').select_option('lecteur')
    page.get_by_role('button', name='Entrer dans l’administration').click()
    go(page, '/admin/produits')
    expect(page.get_by_role('button', name='Ajouter')).to_have_count(0)
    expect(page.locator('.admin-main')).to_contain_text('consultation')
    page.get_by_role('button', name='Se déconnecter').click()
    page.get_by_role('button', name='Entrer dans l’administration').click()


@step('Multi-boutiques : une nouvelle boutique est vide et isolée')
def t_shops(page):
    go(page, '/admin/boutiques')
    page.get_by_label('Nom de la boutique').fill('Boutique Thiès (test)')
    page.get_by_role('button', name='Créer').click()
    page.locator('tr', has_text='Boutique Thiès (test)').get_by_role('button', name='Ouvrir').click()
    page.wait_for_timeout(300)
    go(page, '/admin/produits')
    expect(page.locator('.admin-main')).to_contain_text('Aucun élément')
    go(page, '/boutique')
    expect(page.locator('.pcard')).to_have_count(0)
    go(page, '/admin/boutiques')
    page.locator('tr', has_text='DIONDA STORE').get_by_role('button', name='Ouvrir').click()
    page.wait_for_timeout(300)
    go(page, '/boutique')
    expect(page.locator('.pcard')).to_have_count(28)


@step('Photos : une photo présente remplace l’illustration, une photo absente ne casse rien')
def t_photos(page):
    photo = Path(URL.replace('file://', '')).parent / 'photos' / 'fonio.jpg'
    go(page, '/boutique?q=fonio')
    if photo.exists():
        expect(page.locator('.pcard .product-photo.is-loaded')).to_have_count(1)
        go(page, '/produit/fonio')
        expect(page.locator('.pdp-media .product-photo.is-loaded')).to_be_visible()
        expect(page.locator('.pdp-media .product-photo')).to_have_attribute('src', re.compile('fonio-sachet.jpg'))
        expect(page.locator('.pdp-thumb')).to_have_count(2)
        page.get_by_role('button', name='Photo 2 sur 2').click()
        expect(page.locator('.pdp-media .product-photo')).to_have_attribute('src', re.compile(r'photos/fonio\.jpg'))
        expect(page.get_by_role('button', name='Photo 2 sur 2')).to_have_attribute('aria-pressed', 'true')
        page.screenshot(path=str(SHOTS / '18-photo-produit.png'))
    go(page, '/boutique?q=panier')
    expect(page.locator('.pcard .product-photo.is-loaded')).to_have_count(0)
    expect(page.locator('.pcard svg.product-visual')).to_have_count(1)
    go(page, '/admin/produits?id=prd_fonio')
    dlg = page.get_by_role('dialog')
    expect(dlg.get_by_label('Photo du produit')).to_have_value('fonio-sachet.jpg')
    expect(dlg.get_by_label('Autres photos (fiche produit)')).to_have_value('fonio.jpg')
    if photo.exists():
        expect(dlg.locator('.photo-preview img:not(.sr-only)')).to_be_visible()
    dlg.get_by_label('Photo du produit').fill('introuvable.jpg')
    expect(dlg.locator('.photo-preview')).to_contain_text('introuvable')
    page.screenshot(path=str(SHOTS / '19-admin-photo.png'))
    page.keyboard.press('Escape')


@step('Mobile : accueil, menu, fiche et fenêtre Vertus (390 px)')
def t_mobile(page):
    page.set_viewport_size({'width': 390, 'height': 844})
    go(page, '/')
    page.screenshot(path=str(SHOTS / '15-mobile-accueil.png'))
    page.get_by_role('button', name='Menu').click()
    expect(page.locator('#nav-principale')).to_be_visible()
    page.get_by_role('button', name='Menu').click()
    go(page, '/produit/bissap')
    page.screenshot(path=str(SHOTS / '16-mobile-fiche.png'), full_page=True)
    page.get_by_role('button', name='Vertus').first.click()
    page.screenshot(path=str(SHOTS / '17-mobile-vertus.png'))
    page.keyboard.press('Escape')
    overflow = page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
    assert not overflow, 'débordement horizontal sur mobile'
    page.set_viewport_size({'width': 1360, 'height': 900})


def main():
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={'width': 1360, 'height': 900}, locale='fr-FR')
        # Les photos absentes du dossier photos/ sont attendues (repli sur l'illustration) : on ignore ces erreurs de chargement.
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' and 'ERR_FILE_NOT_FOUND' not in m.text else None)
        page.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
        expect.set_options(timeout=4000)
        for t in [t_home, t_catalog, t_origin_dialog, t_virtues, t_product, t_bundles, t_checkout, t_terroirs, t_admin_login, t_admin_orders, t_cancel, t_admin_category, t_admin_product, t_admin_lot, t_admin_movement, t_delete_guard, t_admin_modules, t_settings, t_roles, t_shops, t_photos, t_mobile]:
            t(page)
        browser.close()
    ok = sum(1 for r in results if r[1] == 'OK')
    print(f'\n{ok}/{len(results)} scénarios réussis · erreurs console : {len(errors)}')
    for e in errors[:10]:
        print('   console:', e[:200])
    sys.exit(0 if ok == len(results) and not errors else 1)


if __name__ == '__main__':
    main()
