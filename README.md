# Secret Santa en famille 🎅

Petite application web (sans inscription) pour organiser le Secret Santa de Noël en famille, à héberger sur **GitHub Pages**.

## Fonctionnalités

- **Tirage au sort qui tient compte de la famille** : la grand-mère, ses enfants et tout ce qui s'y rattache (conjoints, petits-enfants, conjoints des petits-enfants) sont répartis en *branches* et en *générations*. Le tirage :
  - forme **une seule grande boucle** : A offre à B, B à C… jusqu'au dernier qui offre à A. Le jour J, les cadeaux s'ouvrent à la chaîne ;
  - n'attribue jamais quelqu'un à lui-même, ni (par défaut) à son conjoint ;
  - fait offrir à une **autre branche** autant que possible (ou obligatoirement, au choix) ;
  - **mélange les générations** autant que possible ;
  - évite les échanges réciproques (A offre à B et B offre à A).
  Le tirage reste aléatoire : on tire plusieurs fois au hasard, on améliore chaque tirage, et on garde au hasard l'un des meilleurs.
- **Chacun voit à qui il offre** : en arrivant, on choisit son prénom dans un menu déroulant, un petit écran de chargement s'affiche, puis « Es-tu sûr(e) d'être … ? ». Une fois confirmé, on arrive dans son espace perso, on touche le paquet cadeau 🎁 et on découvre le prénom… et le souhait de la personne.
- **Chacun enregistre son souhait directement dans l'application**, depuis son espace perso (et peut le modifier) : 🍫 douceur à manger, 🕯️ petite déco, 🧶 fait main, 🎉 surprise surprise, ✏️ autre (à préciser).
- L'espace organisateur n'affiche pas qui offre à qui.
- Fonctionne sur téléphone, mode sombre automatique.

## Mise en ligne (GitHub Pages)

1. Sur GitHub : **Settings → Pages → Build and deployment → Deploy from a branch**, branche `main`, dossier `/ (root)`.
2. L'application est alors disponible à l'adresse : `https://cervog.github.io/Secret-Santa/`.

> ⚠️ GitHub Pages n'est disponible sur un dépôt privé qu'avec un abonnement payant (GitHub Pro) : sinon, le dépôt doit être public (Settings → General → Danger Zone → Change visibility).

## Mode d'emploi pour l'organisateur

1. Ouvrir l'application et cliquer sur **🔧 Espace organisateur** (en bas de l'accueil).
2. **L'événement** : titre, date, budget, et l'adresse de la base des souhaits (voir ci-dessous).
3. **La famille** : pour chaque personne, son prénom, sa *branche* (le nom de l'enfant de la grand-mère auquel elle se rattache ; la grand-mère est seule dans sa branche « Mamie »), sa génération et son conjoint.
4. **Les règles** : ajuster si besoin (les réglages par défaut conviennent dans la plupart des cas).
5. **Lancer le tirage**, puis le **publier** (étape 7) : chacun pourra alors le découvrir en choisissant son prénom.
6. Chacun enregistre son souhait dans son espace perso. L'organisateur les voit (et peut les corriger) dans **5. Les souhaits**.
7. **Publier** (après le tirage ou un changement de la famille) : télécharger `famille.json` et le déposer dans le dossier `data/` sur GitHub (*Add file → Upload files → Commit changes*). Une à deux minutes plus tard, le site est à jour.

> Les données de l'organisateur (famille, tirage) sont enregistrées dans le navigateur de son appareil. Pour changer d'appareil ou par sécurité : *Sauvegarde, autre appareil… → Télécharger une sauvegarde complète* .

## Créer la base des souhaits (une fois, 5 minutes, gratuit)

GitHub Pages ne sait pas enregistrer de données : les souhaits sont stockés dans une petite base **Firebase Realtime Database** (offre gratuite « Spark », sans carte bancaire).

1. Aller sur <https://console.firebase.google.com> (compte Google), **Créer un projet** (par ex. `secret-santa`). Google Analytics n'est pas utile.
2. Dans le menu **Créer › Realtime Database** : **Créer une base de données**, emplacement **Belgique (europe-west1)**, démarrer en **mode verrouillé**.
3. Onglet **Règles** : remplacer le contenu par celui du fichier [`firebase-regles.json`](firebase-regles.json), puis **Publier**. Ces règles autorisent seulement la lecture et l'écriture des souhaits (un type parmi les 5 choix, une précision de 140 caractères maximum).
4. Onglet **Données** : copier l'adresse affichée en haut, du type `https://secret-santa-xxxx-default-rtdb.europe-west1.firebasedatabase.app`.
5. La coller dans l'espace organisateur (**1. L'événement › Adresse de la base des souhaits**) : le message « ✅ Base connectée » doit s'afficher. Publier ensuite `famille.json` (étape 7).

> Sans base, l'espace perso affiche « L'enregistrement des souhaits n'est pas encore ouvert ».

## Comment c'est fait

```
index.html               page unique
css/style.css            styles
js/tirage.js             algorithme du tirage (testable seul)
js/app.js                accueil, page personnelle, espace organisateur
data/famille.json        famille, règles, tirage, adresse de la base des souhaits
firebase-regles.json     règles de sécurité à coller dans Firebase
scripts/tester-tirage.js tests : node scripts/tester-tirage.js
```

- GitHub Pages ne sert que des fichiers statiques : il n'y a pas de base de données.
  - Le **tirage** est publié dans `data/famille.json` par l'organisateur.
  - Les **souhaits** sont enregistrés dans Firebase par chacun, via l'API REST de la base (aucune bibliothèque à charger).
- C'est un jeu en famille, on se fait confiance 😉 : rien n'empêche quelqu'un de choisir le prénom d'un autre (seule la confirmation l'en dissuade), d'ouvrir le fichier du dépôt, ou de modifier le souhait d'un autre.
