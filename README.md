# Secret Santa en famille 🎅

Petite application web (sans serveur, sans inscription) pour organiser le Secret Santa de Noël en famille, à héberger sur **GitHub Pages**.

## Fonctionnalités

- **Tirage au sort qui tient compte de la famille** : la grand-mère, ses enfants et tout ce qui s'y rattache (conjoints, petits-enfants, conjoints des petits-enfants) sont répartis en *branches* et en *générations*. Le tirage :
  - n'attribue jamais quelqu'un à lui-même, ni (par défaut) à son conjoint ;
  - fait offrir à une **autre branche** autant que possible (ou obligatoirement, au choix) ;
  - **mélange les générations** autant que possible ;
  - évite les échanges réciproques (A offre à B et B offre à A).
  Le tirage reste aléatoire : on tire plusieurs fois au hasard, on améliore chaque tirage, et on garde au hasard l'un des meilleurs.
- **Chacun voit à qui il offre** : en arrivant, on choisit son prénom dans un menu déroulant, un petit écran de chargement s'affiche, puis « Es-tu sûr(e) d'être … ? ». Une fois confirmé, on arrive dans son espace perso, on touche le paquet cadeau 🎁 et on découvre le prénom… et le souhait de la personne.
- **Chacun indique son souhait** pour son Santa : 🍫 douceur à manger, 🕯️ petite déco, 🧶 fait main, 🎉 surprise surprise, ✏️ autre (à préciser).
- Personne, pas même l'organisateur, ne voit le résultat complet du tirage dans l'application.
- Fonctionne sur téléphone, mode sombre automatique.

## Mise en ligne (GitHub Pages)

1. Sur GitHub : **Settings → Pages → Build and deployment → Deploy from a branch**, branche `main`, dossier `/ (root)`.
2. L'application est alors disponible à l'adresse : `https://cervog.github.io/Secret-Santa/`.

> ⚠️ GitHub Pages n'est disponible sur un dépôt privé qu'avec un abonnement payant (GitHub Pro) : sinon, le dépôt doit être public (Settings → General → Danger Zone → Change visibility).

## Mode d'emploi pour l'organisateur

1. Ouvrir l'application et cliquer sur **🔧 Espace organisateur** (en bas de l'accueil).
2. **L'événement** : titre, date, budget, prénom et téléphone de l'organisateur.
3. **La famille** : pour chaque personne, son prénom, sa *branche* (le nom de l'enfant de la grand-mère auquel elle se rattache ; la grand-mère est seule dans sa branche « Mamie »), sa génération et son conjoint.
4. **Les règles** : ajuster si besoin (les réglages par défaut conviennent dans la plupart des cas).
5. **Lancer le tirage**, puis le **publier** (étape 7) : chacun pourra alors le découvrir en choisissant son prénom.
6. Chacun choisit son souhait sur sa page et l'envoie à l'organisateur en un clic (WhatsApp, SMS ou copier-coller). L'organisateur colle les messages reçus dans **5. Les souhaits**.
7. **Publier** (après le tirage et à chaque nouveau souhait) : télécharger `famille.json` et le déposer dans le dossier `data/` sur GitHub (*Add file → Upload files → Commit changes*). Une à deux minutes plus tard, le site est à jour.

> Les données de l'organisateur (famille, tirage) sont enregistrées dans le navigateur de son appareil. Pour changer d'appareil ou par sécurité : *Sauvegarde, autre appareil… → Télécharger une sauvegarde complète* .

## Comment c'est fait

```
index.html               page unique
css/style.css            styles
js/tirage.js             algorithme du tirage (testable seul)
js/app.js                accueil, page personnelle, espace organisateur
data/famille.json        famille, règles, tirage (brouillé) et souhaits
scripts/tester-tirage.js tests : node scripts/tester-tirage.js
```

- GitHub Pages ne sert que des fichiers statiques : il n'y a pas de base de données.
  - Le **tirage** et les **souhaits** sont publiés dans `data/famille.json` par l'organisateur. Le tirage y est brouillé pour qu'on ne lise pas la réponse en ouvrant le fichier.
- C'est un jeu en famille, on se fait confiance 😉 : rien n'empêche quelqu'un de choisir le prénom d'un autre (seule la confirmation l'en dissuade), ni un petit malin de décoder le fichier.
- Évolution possible : brancher une base gratuite (Firebase, Supabase…) pour que les souhaits s'enregistrent directement, sans passer par l'organisateur.
