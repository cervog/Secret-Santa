/*
 * Tirage au sort du Secret Santa.
 *
 * Contraintes STRICTES (jamais violées) :
 *   - on ne s'offre pas de cadeau à soi-même ;
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
      const attr = tirageAleatoire(ids, ctx, rnd, 20000);
      if (!attr) continue;
      const c = ameliorer(attr, ids, ctx, rnd);
      resultats.push({ attr, c });
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
    return { total: m.size, memeBranche, memeGeneration, reciproques: reciproques / 2 };
  }

  const api = { tirer, statistiques, REGLES_PAR_DEFAUT };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.Tirage = api;
})(typeof window !== "undefined" ? window : globalThis);
