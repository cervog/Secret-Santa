// Vérifie le tirage : node scripts/tester-tirage.js
const path = require("path");
const assert = require("assert");
const Tirage = require("../js/tirage.js");
const data = require(path.join(__dirname, "../data/famille.json"));

const P = data.participants;
const parId = Object.fromEntries(P.map((p) => [p.id, p]));

function verifier(attr, regles) {
  const receveurs = Object.values(attr);
  assert.strictEqual(new Set(receveurs).size, P.length, "chacun reçoit exactement un cadeau");
  for (const [a, b] of Object.entries(attr)) {
    assert.notStrictEqual(a, b, "pas à soi-même");
    if (regles.conjoint) assert.notStrictEqual(parId[a].conjoint, b, "pas à son conjoint");
    if (regles.branche === "stricte") assert.notStrictEqual(parId[a].branche, parId[b].branche);
    if (regles.reciproque === "stricte") assert.notStrictEqual(attr[b], a);
  }
}

const N = 300;
let cumul = { memeBranche: 0, memeGeneration: 0, reciproques: 0 };
const vus = new Set();
for (let i = 0; i < N; i++) {
  const res = Tirage.tirer(P, data.regles);
  assert.ok(res.ok, res.erreur);
  verifier(res.attributions, data.regles);
  for (const k in cumul) cumul[k] += res.stats[k];
  vus.add(JSON.stringify(res.attributions));
}
console.log(`Règles du fichier : ${N} tirages OK, ${vus.size} tirages différents.`);
console.log("Moyennes :", Object.fromEntries(Object.entries(cumul).map(([k, v]) => [k, (v / N).toFixed(2)])));

// Règles strictes : branche stricte impossible ici (5+5+1 : faisable ? on teste juste qu'on ne viole rien)
const strict = { conjoint: true, branche: "stricte", generation: "preference", reciproque: "stricte" };
const r2 = Tirage.tirer(P, strict);
if (r2.ok) { verifier(r2.attributions, strict); console.log("Règles strictes : OK", r2.stats); }
else console.log("Règles strictes : impossible →", r2.erreur);

// Cas impossible : 3 personnes dont un couple
const imp = Tirage.tirer([
  { id: "a", branche: "x", generation: 1, conjoint: "b" },
  { id: "b", branche: "x", generation: 1, conjoint: "a" },
  { id: "c", branche: "y", generation: 1 }
], { conjoint: true });
assert.ok(!imp.ok);
console.log("Cas impossible détecté :", imp.erreur);

// Branche majoritaire en stricte → message clair
const maj = Tirage.tirer([
  ...["a", "b", "c", "d"].map((id) => ({ id, branche: "X", generation: 2 })),
  { id: "e", branche: "Y", generation: 2 }
], { branche: "stricte" });
assert.ok(!maj.ok);
console.log("Branche majoritaire détectée.");
console.log("Tous les tests passent ✔");
