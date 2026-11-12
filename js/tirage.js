/*
 * Tirage au sort du Secret Santa.
 *
 * Contraintes STRICTES (jamais violées) :
 *   - on ne s'offre pas de cadeau à soi-même ;
 *   - (option, activée par défaut) une seule grande boucle : A offre à B, B à C…
 *     jusqu'au dernier qui offre à A. Le jour J, les cadeaux s'ouvrent à la chaîne ;
 *   - (option) jamais à son conjoint ;
 *   - (option "stricte") jamais à quelqu'un de sa branche familiale ;
 *   - (option) pas d'échange réciproque (A → B et B → A).
 *
 * Préférences SOUPLES (on cherche à les respecter au mieux) :
 *   - offrir à quelqu'un d'une autre branche familiale ;
 *   - offrir à quelqu'un d'une autre génération ;
 *   - éviter les échanges réciproques.
 *
 * Méthode : on part de plusieurs tirages aléatoires valides, on les améliore
 * par échanges successifs (recherche locale), puis on garde l'un des meilleurs
 * au hasard. Résultat : un tirage aléatoire, mais qui mélange au mieux.
 */
(function (global) {
  "use strict";

  const POIDS = { branche: 10, generation: 3, reciproque: 4 };

  const REGLES_PAR_DEFAUT = {
    boucle: true,            // une seule chaîne qui boucle sur tout le monde
    conjoint: true,          // jamais à son conjoint
    branche: "preference",   // "stricte" | "preference" | "ignorer"
    generation: "preference",// "preference" | "ignorer"
    reciproque: "preference" // "stricte" | "preference" | "ignorer"
  };

  function melanger(tab, rnd) {
    for (let i = tab.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [tab[i], tab[j]] = [tab[j], tab[i]];
    }
    return tab;
  }

  function conjointsDe(participants) {
    const map = new Map();
    for (const p of participants) {
      if (p.conjoint) {
        map.set(p.id, p.conjoint);
        map.set(p.conjoint, p.id);
      }
    }
    return map;
  }

  /** Construit les fonctions "autorisé ?" et "coût" pour un groupe et des règles. */
  function preparer(participants, regles) {
    const r = Object.assign({}, REGLES_PAR_DEFAUT, regles || {});
    const conj = conjointsDe(participants);
    const parId = new Map(participants.map((p) => [p.id, p]));

    function autorise(a, b) {
      if (a === b) return false;
      if (r.conjoint && conj.get(a) === b) return false;
      if (r.branche === "stricte" && parId.get(a).branche === parId.get(b).branche) return false;
      return true;
    }

    function coutPaire(a, b) {
      const pa = parId.get(a), pb = parId.get(b);
      let c = 0;
      if (r.branche === "preference" && pa.branche === pb.branche) c += POIDS.branche;
      if (r.generation === "preference" && Number(pa.generation) === Number(pb.generation)) c += POIDS.generation;
      return c;
    }

    // attribution : Map donneur -> receveur
    function reciproquesInterdits(attr) {
      if (r.reciproque !== "stricte") return false;
      for (const [a, b] of attr) if (attr.get(b) === a) return true;
      return false;
    }

    function cout(attr) {
      let c = 0;
      for (const [a, b] of attr) {
        c += coutPaire(a, b);
        if (r.reciproque === "preference" && attr.get(b) === a) c += POIDS.reciproque / 2; // compté 2 fois
      }
      return c;
    }

    return { r, autorise, cout, reciproquesInterdits };
  }

  /** Tirage aléatoire respectant les contraintes strictes (retour arrière). */
  function tirageAleatoire(ids, ctx, rnd, budget) {
    const donneurs = melanger(ids.slice(), rnd);
    const pris = new Set();
    const attr = new Map();
    let essais = 0;

    function placer(i) {
      if (++essais > budget) return false;
      if (i === donneurs.length) return !ctx.reciproquesInterdits(attr);
      const a = donneurs[i];
      const candidats = melanger(ids.filter((b) => !pris.has(b) && ctx.autorise(a, b)), rnd);
      for (const b of candidats) {
        if (ctx.r.reciproque === "stricte" && attr.get(b) === a) continue;
        pris.add(b); attr.set(a, b);
        if (placer(i + 1)) return true;
        pris.delete(b); attr.delete(a);
      }
      return false;
    }

    return placer(0) ? attr : null;
  }

  // ----- Mode « une seule boucle » : on cherche un ordre de passage -----
  const versAttr = (ordre) => new Map(ordre.map((a, i) => [a, ordre[(i + 1) % ordre.length]]));

  function boucleValide(ordre, ctx) {
    for (let i = 0; i < ordre.length; i++) {
      if (!ctx.autorise(ordre[i], ordre[(i + 1) % ordre.length])) return false;
    }
    return true;
  }

  /** Ordre aléatoire dont chaque voisin (et le dernier → le premier) est autorisé. */
  function boucleAleatoire(ids, ctx, rnd, budget) {
    const reste = melanger(ids.slice(), rnd);
    const ordre = [reste.pop()];
    const pris = new Set(ordre);
    let essais = 0;

    function placer() {
      if (++essais > budget) return false;
      if (ordre.length === ids.length) return ctx.autorise(ordre[ordre.length - 1], ordre[0]);
      const dernier = ordre[ordre.length - 1];
      const candidats = melanger(ids.filter((b) => !pris.has(b) && ctx.autorise(dernier, b)), rnd);
      for (const b of candidats) {
        ordre.push(b); pris.add(b);
        if (placer()) return true;
        ordre.pop(); pris.delete(b);
      }
      return false;
    }
    return placer() ? ordre : null;
  }

  /** Amélioration en échangeant la place de deux personnes dans la boucle. */
  function ameliorerBoucle(ordre, ctx, rnd) {
    let courant = ctx.cout(versAttr(ordre));
    let progres = true;
    while (progres && courant > 0) {
      progres = false;
      const positions = melanger([...ordre.keys()], rnd);
      for (let x = 0; x < positions.length && courant > 0; x++) {
        for (let y = x + 1; y < positions.length; y++) {
          const i = positions[x], j = positions[y];
          [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
          const c = boucleValide(ordre, ctx) ? ctx.cout(versAttr(ordre)) : Infinity;
          if (c < courant) { courant = c; progres = true; }
          else [ordre[i], ordre[j]] = [ordre[j], ordre[i]];
        }
      }
    }
    return courant;
  }

  /** Amélioration par échanges de receveurs entre deux donneurs. */
  function ameliorer(attr, ids, ctx, rnd) {
    let courant = ctx.cout(attr);
    let progres = true;
    while (progres && courant > 0) {
      progres = false;
      const ordre = melanger(ids.slice(), rnd);
      for (let i = 0; i < ordre.length && courant > 0; i++) {
        for (let j = i + 1; j < ordre.length; j++) {
          const a = ordre[i], b = ordre[j];
          const ra = attr.get(a), rb = attr.get(b);
          if (!ctx.autorise(a, rb) || !ctx.autorise(b, ra)) continue;
          attr.set(a, rb); attr.set(b, ra);
          const c = ctx.cout(attr);
          if (c < courant && !ctx.reciproquesInterdits(attr)) {
            courant = c; progres = true;
          } else {
            attr.set(a, ra); attr.set(b, rb);
          }
        }
      }
    }
    return courant;
  }

  /**
   * Effectue le tirage.
   * @returns {{ok:true, attributions:Object, stats:Object} | {ok:false, erreur:string}}
   */
  function tirer(participants, regles, options) {
    const opts = Object.assign({ essais: 60, rnd: Math.random }, options || {});
    const rnd = opts.rnd;

    if (participants.length < 3) {
      return { ok: false, erreur: "Il faut au moins 3 participants." };
    }
    const ids = participants.map((p) => p.id);
    if (new Set(ids).size !== ids.length) {
      return { ok: false, erreur: "Deux participants ont le même identifiant." };
    }

    const ctx = preparer(participants, regles);
    const resultats = [];
    for (let k = 0; k < opts.essais; k++) {
      if (ctx.r.boucle) {
        const ordre = boucleAleatoire(ids, ctx, rnd, 20000);
        if (!ordre) continue;
        const c = ameliorerBoucle(ordre, ctx, rnd);
        resultats.push({ attr: versAttr(ordre), c });
      } else {
        const attr = tirageAleatoire(ids, ctx, rnd, 20000);
        if (!attr) continue;
        const c = ameliorer(attr, ids, ctx, rnd);
        resultats.push({ attr, c });
      }
    }

    if (!resultats.length) {
      let msg = "Impossible de trouver un tirage qui respecte toutes les règles strictes.";
      if (ctx.r.branche === "stricte") {
        msg += " Une branche familiale regroupe sans doute plus de la moitié des participants : passez la règle « branches » sur « de préférence ».";
      }
      return { ok: false, erreur: msg };
    }

    const meilleur = Math.min(...resultats.map((x) => x.c));
    const choix = resultats.filter((x) => x.c === meilleur);
    const elu = choix[Math.floor(rnd() * choix.length)].attr;

    return { ok: true, attributions: Object.fromEntries(elu), stats: statistiques(participants, elu) };
  }

  /** Statistiques anonymes (ne révèlent pas qui offre à qui). */
  function statistiques(participants, attr) {
    const parId = new Map(participants.map((p) => [p.id, p]));
    const m = attr instanceof Map ? attr : new Map(Object.entries(attr));
    let memeBranche = 0, memeGeneration = 0, reciproques = 0;
    for (const [a, b] of m) {
      if (parId.get(a).branche === parId.get(b).branche) memeBranche++;
      if (Number(parId.get(a).generation) === Number(parId.get(b).generation)) memeGeneration++;
      if (m.get(b) === a) reciproques++;
    }
    return { total: m.size, memeBranche, memeGeneration, reciproques: reciproques / 2, boucles: nombreDeBoucles(m) };
  }

  /** Nombre de boucles distinctes dans un tirage (1 = une seule grande chaîne). */
  function nombreDeBoucles(attributions) {
    const m = attributions instanceof Map ? attributions : new Map(Object.entries(attributions));
    const vus = new Set();
    let n = 0;
    for (const depart of m.keys()) {
      if (vus.has(depart)) continue;
      n++;
      for (let x = depart; !vus.has(x); x = m.get(x)) vus.add(x);
    }
    return n;
  }

  const api = { tirer, statistiques, nombreDeBoucles, REGLES_PAR_DEFAUT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.Tirage = api;
})(typeof window !== "undefined" ? window : globalThis);
