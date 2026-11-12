# Secret Santa en famille 🎅

Petite application web (sans serveur, sans inscription) pour organiser le Secret Santa de Noël en famille, à héberger sur **GitHub Pages**.

## Fonctionnalités

- **Tirage au sort qui tient compte de la famille** : la grand-mère, ses enfants et tout ce qui s'y rattache (conjoints, petits-enfants, conjoints des petits-enfants) sont répartis en *branches* et en *générations*. Le tirage :
  - n'attribue jamais quelqu'un à lui-même, ni (par défaut) à son conjoint ;
  - fait offrir à une **autre branche** autant que possible (ou obligatoirement, au choix) ;
  - **mélange les générations** autant que possible ;
  - évite les échanges réciproques (A offre à B et B offre à A).
  Le tirage reste aléatoire : on tire plusieurs fois au hasard, on améliore chaque tirage, et on garde au hasard l'un des meilleurs.
- **Chacun voit à qui il offre** grâce à son **lien personnel** : il touche le paquet cadeau 🎁 et découvre le prénom… et le souhait de la personne.
- **Chacun indique son souhait** pour son Santa : 🍫 douceur à manger, 🕯️ petite déco, 🧶 fait main, 🎉 surprise surprise, ✏️ autre (à préciser).
- Personne, pas même l'organisateur, ne voit le résultat complet du tirage dans l'application.
- Fonctionne sur téléphone, mode sombre automatique.

## Mise en ligne (GitHub Pages)

1. Sur GitHub : **Settings → Pages → Build and deployment → Deploy from a branch**, branche `main`, dossier `/ (root)`.
2. L'application est alors disponible à l'adresse : `https://cervog.github.io/Secret-Santa/`.

> ⚠️ Ce dépôt est **privé** : GitHub Pages n'est disponible sur un dépôt privé qu'avec un abonnement payant (GitHub Pro). Sinon, rendez le dépôt public (Settings → General → Danger Zone → Change visibility). Le résultat du tirage n'est jamais stocké dans le dépôt, seuls la famille et les souhaits y figurent.

## Mode d'emploi pour l'organisateur

1. Ouvrir l'application et cliquer sur **🔧 Espace organisateur** (en bas de l'accueil).
2. **L'événement** : titre, date, budget, prénom et téléphone de l'organisateur.
3. **La famille** : pour chaque personne, son prénom, sa *branche* (le nom de l'enfant de la grand-mère auquel elle se rattache ; la grand-mère est seule dans sa branche « Mamie »), sa génération et son conjoint.
4. **Les règles** : ajuster si besoin (les réglages par défaut conviennent dans la plupart des cas).
5. **Lancer le tirage** puis envoyer à chacun **son** lien (bouton WhatsApp ou « Copier le lien »).
6. Chacun choisit son souhait sur sa page et l'envoie à l'organisateur en un clic (WhatsApp, SMS ou copier-coller). L'organisateur colle les messages reçus dans **5. Les souhaits**.
7. **Publier** : télécharger `famille.json` et le déposer dans le dossier `data/` sur GitHub (*Add file → Upload files → Commit changes*). Les pages personnelles affichent alors les souhaits à jour.

> Les données de l'organisateur (famille, tirage) sont enregistrées dans le navigateur de son appareil. Pour changer d'appareil ou par sécurité : *Sauvegarde, autre appareil… → Télécharger une sauvegarde complète* (à garder pour soi : elle contient les liens du tirage).

## Comment c'est fait

```
index.html               page unique
css/style.css            styles
js/tirage.js             algorithme du tirage (testable seul)
js/app.js                accueil, page personnelle, espace organisateur
data/famille.json        famille, règles et souhaits publiés (pas le tirage)
scripts/tester-tirage.js tests : node scripts/tester-tirage.js
```

- GitHub Pages ne sert que des fichiers statiques : il n'y a pas de base de données.
  - Le **résultat du tirage** voyage dans les liens personnels (brouillé, pour qu'on ne lise pas la réponse dans l'adresse par mégarde). Il n'est jamais publié dans le dépôt.
  - Les **souhaits** sont publiés dans `data/famille.json` par l'organisateur.
- Le brouillage protège des regards indiscrets, pas d'un petit malin qui voudrait décoder le lien d'un autre : c'est un jeu en famille, on se fait confiance 😉.
- Évolution possible : brancher une base gratuite (Firebase, Supabase…) pour que les souhaits s'enregistrent directement, sans passer par l'organisateur.
