/* Secret Santa en famille — application (page unique, sans serveur). */
(function () {
  "use strict";

  const SOUHAITS = {
    douceur:  { emoji: "🍫", label: "Douceur à manger" },
    deco:     { emoji: "🕯️", label: "Petite déco" },
    faitmain: { emoji: "🧶", label: "Fait main" },
    surprise: { emoji: "🎉", label: "Surprise surprise !" },
    autre:    { emoji: "✏️", label: "Autre (à préciser)" }
  };
  const GENERATIONS = {
    1: "Grands-parents",
    2: "Enfants",
    3: "Petits-enfants",
    4: "Arrière-petits-enfants"
  };
  const CLE_ORGA = "secretSanta.orga.v1";
  const CLE_MOI = "secretSanta.monSouhait.v1";

  const app = document.getElementById("app");
  let publie = null; // contenu de data/famille.json

  // ---------- utilitaires ----------
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  function lire(cle) { try { return JSON.parse(localStorage.getItem(cle)); } catch { return null; } }
  function ecrire(cle, v) { try { localStorage.setItem(cle, JSON.stringify(v)); } catch { /* stockage indisponible */ } }

  function slug(nom, pris) {
    let base = String(nom).normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "p";
    let id = base, n = 2;
    while (pris.has(id)) id = base + "-" + n++;
    return id;
  }

  function dateFr(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function telInternational(tel) {
    let t = String(tel || "").replace(/[^\d+]/g, "");
    if (t.startsWith("+")) return t.slice(1);
    if (t.startsWith("00")) return t.slice(2);
    if (t.startsWith("0")) return "33" + t.slice(1); // numéro français
    return t;
  }

  function texteSouhait(s) {
    if (!s || !SOUHAITS[s.type]) return null;
    const def = SOUHAITS[s.type];
    const label = s.type === "autre" ? "Autre" : def.label;
    return { emoji: def.emoji, label, precision: s.precision || "" };
  }

  async function copier(texte, bouton) {
    try {
      await navigator.clipboard.writeText(texte);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = texte; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); ta.remove();
    }
    if (bouton) {
      const avant = bouton.textContent;
      bouton.textContent = "✔ Copié !";
      setTimeout(() => (bouton.textContent = avant), 1500);
    }
  }

  // ---------- liens personnels ----------
  // Le lien contient (brouillé) le prénom de la personne et celui à qui elle offre.
  // Le brouillage évite de lire la réponse dans l'adresse par mégarde.
  const MASQUE = "Joyeux-Noel-Secret-Santa";
  function brouiller(obj) {
    const octets = new TextEncoder().encode(JSON.stringify(obj));
    const out = octets.map((b, i) => b ^ (MASQUE.charCodeAt(i % MASQUE.length) + i * 7) & 255);
    let bin = ""; out.forEach((b) => (bin += String.fromCharCode(b)));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function debrouiller(code) {
    try {
      const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
      const octets = Uint8Array.from(bin, (c) => c.charCodeAt(0))
        .map((b, i) => b ^ (MASQUE.charCodeAt(i % MASQUE.length) + i * 7) & 255);
      const obj = JSON.parse(new TextDecoder().decode(octets));
      return obj && obj.v === 1 && obj.g && obj.r ? obj : null;
    } catch { return null; }
  }
  function urlPersonnelle(code) {
    return location.href.split("#")[0] + "#/l/" + code;
  }

  // ---------- données publiées ----------
  async function chargerPublie() {
    if (publie) return publie;
    try {
      const rep = await fetch("data/famille.json", { cache: "no-cache" });
      publie = rep.ok ? await rep.json() : {};
    } catch { publie = {}; }
    return publie;
  }

  // ---------- routeur ----------
  async function route() {
    const h = location.hash || "#/";
    window.scrollTo(0, 0);
    if (h.startsWith("#/l/")) return pagePersonnelle(h.slice(4));
    if (h.startsWith("#/orga")) return pageOrga();
    return pageAccueil();
  }
  window.addEventListener("hashchange", route);

  // =====================================================================
  // ACCUEIL
  // =====================================================================
  async function pageAccueil() {
    const d = await chargerPublie();
    app.innerHTML = `
      <header class="entete">
        <div class="grand-emoji">🎅</div>
        <h1>${esc(d.titre || "Secret Santa en famille")}</h1>
        ${d.date ? `<p class="sous-titre">${esc(dateFr(d.date))}</p>` : ""}
      </header>
      <section class="carte">
        <h2>Comment ça marche ?</h2>
        <ol class="etapes">
          <li><b>L'organisateur</b> fait le tirage au sort : chacun offre <b>un seul cadeau</b>, de préférence à quelqu'un d'une autre famille et d'une autre génération.</li>
          <li>Tu reçois <b>ton lien personnel</b> (par message). Ouvre-le pour découvrir à qui tu fais un cadeau… et son souhait !</li>
          <li>Sur ta page, indique toi aussi <b>ce qui te ferait plaisir</b> : douceur, déco, fait main, surprise…</li>
        </ol>
        <p class="note">🤫 Ne partage pas ton lien : c'est lui qui contient ton secret.</p>
      </section>
      <section class="carte">
        <h2>Tu as perdu ton lien ?</h2>
        <p>Demande-le à ${d.organisateur?.nom ? `<b>${esc(d.organisateur.nom)}</b>` : "l'organisateur"} : il peut te le renvoyer sans connaître ton secret.</p>
      </section>
      <p class="centre"><a class="lien-discret" href="#/orga">🔧 Espace organisateur</a></p>`;
  }

  // =====================================================================
  // PAGE PERSONNELLE
  // =====================================================================
  async function pagePersonnelle(code) {
    const t = debrouiller(code);
    if (!t) {
      app.innerHTML = `
        <section class="carte centre">
          <div class="grand-emoji">😕</div>
          <h2>Ce lien ne fonctionne pas</h2>
          <p>Il a peut-être été coupé en le copiant. Redemande ton lien à l'organisateur.</p>
          <p><a class="bouton" href="#/">Retour à l'accueil</a></p>
        </section>`;
      return;
    }
    const d = await chargerPublie();
    const tirageActif = d.tirage && d.tirage !== t.t;
    const souhaitLive = d.souhaits && d.souhaits[t.r];
    const souhait = texteSouhait(souhaitLive || t.s);
    const dejaVu = lire("secretSanta.vu." + t.t + "." + t.g);

    app.innerHTML = `
      <header class="entete">
        <div class="grand-emoji">🎄</div>
        <h1>Bonjour ${esc(t.gn)} !</h1>
        <p class="sous-titre">${esc(t.ti || d.titre || "Secret Santa en famille")}</p>
        ${(t.dt || d.date) ? `<p class="petit">${esc(dateFr(t.dt || d.date))}</p>` : ""}
      </header>

      ${tirageActif ? `<div class="alerte">⚠️ Un nouveau tirage a peut-être été fait depuis l'envoi de ce lien. En cas de doute, redemande ton lien à l'organisateur.</div>` : ""}

      <section class="carte centre">
        <h2>Tu es le Secret Santa de…</h2>
        <div class="cadeau ${dejaVu ? "ouvert" : ""}" id="cadeau">
          <button class="cadeau-ferme" id="ouvrir" aria-label="Découvrir à qui j'offre un cadeau">
            <span class="paquet">🎁</span>
            <span>Touche le cadeau pour découvrir</span>
          </button>
          <div class="cadeau-ouvert">
            <div class="receveur">${esc(t.rn)}</div>
            <div class="souhait-receveur">
              ${souhait
                ? `<p class="petit">Son souhait :</p>
                   <p class="pastille">${souhait.emoji} ${esc(souhait.label)}</p>
                   ${souhait.precision ? `<p class="precision">« ${esc(souhait.precision)} »</p>` : ""}`
                : `<p class="petit">${esc(t.rn)} n'a pas encore donné de souhait. Reviens voir plus tard !</p>`}
            </div>
            ${t.b || d.budget ? `<p class="petit">Budget conseillé : <b>${esc(t.b || d.budget)}</b></p>` : ""}
            <p class="note">🤫 Chut, c'est un secret !</p>
          </div>
        </div>
      </section>

      <section class="carte" id="mon-souhait"></section>
      <p class="centre"><a class="lien-discret" href="#/">Comment ça marche ?</a></p>`;

    document.getElementById("ouvrir").onclick = () => {
      document.getElementById("cadeau").classList.add("ouvert");
      ecrire("secretSanta.vu." + t.t + "." + t.g, true);
      confettis();
    };
    blocMonSouhait(t, d);
  }

  function blocMonSouhait(t, d) {
    const el = document.getElementById("mon-souhait");
    const tous = lire(CLE_MOI) || {};
    const publieMoi = d.souhaits && d.souhaits[t.g];
    let brouillon = tous[t.g] || publieMoi || { type: "", precision: "" };
    const memeQuePublie = (s) => publieMoi && s && publieMoi.type === s.type && (publieMoi.precision || "") === (s.precision || "");

    function dessiner(etat) {
      const enregistre = tous[t.g];
      const ok = memeQuePublie(enregistre || publieMoi);
      el.innerHTML = `
        <h2>Et toi, qu'est-ce qui te ferait plaisir ?</h2>
        <p class="petit">Ton Secret Santa verra ton choix (mais toi, tu ne sauras pas qui c'est 😉).</p>
        <div class="choix" role="radiogroup" aria-label="Mon souhait">
          ${Object.entries(SOUHAITS).map(([k, s]) => `
            <button type="button" role="radio" aria-checked="${brouillon.type === k}" class="choix-btn ${brouillon.type === k ? "actif" : ""}" data-type="${k}">
              <span class="choix-emoji">${s.emoji}</span><span>${esc(s.label)}</span>
            </button>`).join("")}
        </div>
        <label class="champ ${brouillon.type ? "" : "cache"}" id="champ-precision">
          <span>${brouillon.type === "autre" ? "Précise ton idée :" : "Une précision ? (facultatif)"}</span>
          <input type="text" id="precision" maxlength="140" value="${esc(brouillon.precision)}"
            placeholder="${brouillon.type === "autre" ? "Ex. : un livre, des chaussettes rigolotes…" : "Ex. : plutôt chocolat noir, couleurs dorées…"}">
        </label>
        <button class="bouton large" id="valider" ${brouillon.type ? "" : "disabled"}>Enregistrer mon souhait</button>
        <div id="envoi">${etat === "envoi" ? envoiHtml(enregistre) : ok ? `<p class="succes">✅ Ton souhait est bien pris en compte : ${esc(SOUHAITS[publieMoi.type].emoji)} ${esc(texteSouhait(publieMoi).label)}${publieMoi.precision ? " — « " + esc(publieMoi.precision) + " »" : ""}</p>` : enregistre ? envoiHtml(enregistre, true) : ""}</div>`;

      el.querySelectorAll(".choix-btn").forEach((b) => (b.onclick = () => {
        brouillon = { type: b.dataset.type, precision: document.getElementById("precision").value };
        dessiner();
        if (brouillon.type === "autre") document.getElementById("precision").focus();
      }));
      document.getElementById("precision").oninput = (e) => (brouillon.precision = e.target.value);
      document.getElementById("valider").onclick = () => {
        brouillon.precision = document.getElementById("precision").value.trim();
        if (brouillon.type === "autre" && !brouillon.precision) {
          document.getElementById("precision").focus();
          document.getElementById("precision").classList.add("erreur");
          return;
        }
        tous[t.g] = { type: brouillon.type, precision: brouillon.precision };
        ecrire(CLE_MOI, tous);
        dessiner(memeQuePublie(tous[t.g]) ? null : "envoi");
      };
      brancherEnvoi(enregistre);
    }

    function message(s) {
      const ts = texteSouhait(s);
      return `🎅 Secret Santa — souhait de ${t.gn} : ${ts.emoji} ${ts.label}${s.precision ? " (" + s.precision + ")" : ""}\n` +
        `#SOUHAIT g=${t.g} type=${s.type}${s.precision ? " | " + s.precision.replace(/\s+/g, " ") : ""}`;
    }

    function envoiHtml(s, enAttente) {
      if (!s) return "";
      const tel = telInternational(d.organisateur?.telephone || t.tel);
      const nom = d.organisateur?.nom || t.on || "l'organisateur";
      const msg = encodeURIComponent(message(s));
      return `
        <div class="encadre">
          <p>${enAttente ? "⏳ Ton souhait n'a pas encore été publié." : "👍 C'est noté !"} Dernière étape : <b>envoie-le à ${esc(nom)}</b>, qui l'ajoutera pour ton Secret Santa.</p>
          <div class="boutons">
            <a class="bouton whatsapp" target="_blank" rel="noopener" href="https://wa.me/${tel}?text=${msg}">WhatsApp</a>
            <a class="bouton secondaire" href="sms:${tel ? "+" + tel : ""}?&body=${msg}">SMS</a>
            <button class="bouton secondaire" id="copier-souhait">Copier le message</button>
          </div>
        </div>`;
    }
    function brancherEnvoi(s) {
      const b = document.getElementById("copier-souhait");
      if (b && s) b.onclick = () => copier(message(s), b);
    }

    dessiner();
  }

  function confettis() {
    const symboles = ["❄️", "⭐", "🎉", "✨", "🎄", "🎁"];
    for (let i = 0; i < 28; i++) {
      const s = document.createElement("span");
      s.className = "confetti";
      s.textContent = symboles[i % symboles.length];
      s.style.left = Math.random() * 100 + "vw";
      s.style.animationDelay = Math.random() * 0.6 + "s";
      s.style.fontSize = 14 + Math.random() * 18 + "px";
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 3200);
    }
  }

  // =====================================================================
  // ESPACE ORGANISATEUR
  // =====================================================================
  async function chargerOrga() {
    let o = lire(CLE_ORGA);
    if (!o) {
      const d = await chargerPublie();
      o = depuisPublie(d);
      ecrire(CLE_ORGA, o);
    }
    return o;
  }
  function depuisPublie(d) {
    const copie = JSON.parse(JSON.stringify(d || {}));
    return {
      titre: copie.titre || "Noël en famille",
      date: copie.date || "",
      budget: copie.budget || "",
      organisateur: copie.organisateur || { nom: "", telephone: "" },
      regles: Object.assign({}, Tirage.REGLES_PAR_DEFAUT, copie.regles || {}),
      participants: copie.participants || [],
      souhaits: copie.souhaits || {},
      tirage: null
    };
  }
  function versPublie(o) {
    const out = {
      titre: o.titre, date: o.date, budget: o.budget,
      organisateur: o.organisateur, regles: o.regles,
      participants: o.participants, souhaits: o.souhaits
    };
    if (o.tirage) out.tirage = o.tirage.id; // identifiant seulement : rien de secret
    return out;
  }
  function empreinte(participants) {
    return participants.map((p) => [p.id, p.nom, p.branche, p.generation, p.conjoint || ""].join(":")).join("|");
  }

  async function pageOrga() {
    const o = await chargerOrga();
    const sauver = () => ecrire(CLE_ORGA, o);
    const branches = () => [...new Set(o.participants.map((p) => p.branche).filter(Boolean))];

    function rendu() {
      const parId = Object.fromEntries(o.participants.map((p) => [p.id, p]));
      const perime = o.tirage && o.tirage.empreinte !== empreinte(o.participants);
      const nbSouhaits = o.participants.filter((p) => o.souhaits[p.id]).length;

      app.innerHTML = `
        <header class="entete">
          <div class="grand-emoji">🔧</div>
          <h1>Espace organisateur</h1>
          <p class="sous-titre">Tout est enregistré sur cet appareil uniquement.</p>
        </header>

        <section class="carte">
          <h2>1. L'événement</h2>
          <div class="grille">
            <label class="champ"><span>Titre</span><input data-k="titre" value="${esc(o.titre)}"></label>
            <label class="champ"><span>Date</span><input type="date" data-k="date" value="${esc(o.date)}"></label>
            <label class="champ"><span>Budget conseillé</span><input data-k="budget" value="${esc(o.budget)}" placeholder="Ex. : 20 €"></label>
            <label class="champ"><span>Organisateur (prénom)</span><input data-k="organisateur.nom" value="${esc(o.organisateur.nom)}"></label>
            <label class="champ"><span>Téléphone de l'organisateur</span><input type="tel" data-k="organisateur.telephone" value="${esc(o.organisateur.telephone)}" placeholder="06 12 34 56 78"></label>
          </div>
          <p class="note">Le téléphone sert au bouton « Envoyer mon souhait par WhatsApp/SMS ». Il sera visible dans le fichier publié : laissez vide si vous préférez.</p>
        </section>

        <section class="carte">
          <h2>2. La famille <span class="compteur">${o.participants.length} personnes</span></h2>
          <p class="petit">La <b>branche</b> regroupe un enfant de la grand-mère avec son conjoint, ses enfants et leurs conjoints. La grand-mère forme sa propre branche. Un conjoint a la même génération que son conjoint.</p>
          <div class="tableau-wrap">
            <table class="tableau">
              <thead><tr><th>Prénom</th><th>Branche</th><th>Génération</th><th>Conjoint</th><th></th></tr></thead>
              <tbody>
                ${o.participants.map((p) => `
                  <tr data-id="${esc(p.id)}">
                    <td><input data-f="nom" value="${esc(p.nom)}" aria-label="Prénom"></td>
                    <td><input data-f="branche" value="${esc(p.branche)}" list="liste-branches" aria-label="Branche"></td>
                    <td><select data-f="generation" aria-label="Génération">
                      ${Object.entries(GENERATIONS).map(([g, l]) => `<option value="${g}" ${Number(p.generation) === Number(g) ? "selected" : ""}>${g} · ${l}</option>`).join("")}
                    </select></td>
                    <td><select data-f="conjoint" aria-label="Conjoint">
                      <option value="">—</option>
                      ${o.participants.filter((q) => q.id !== p.id).map((q) => `<option value="${esc(q.id)}" ${p.conjoint === q.id ? "selected" : ""}>${esc(q.nom)}</option>`).join("")}
                    </select></td>
                    <td><button class="icone" data-suppr="${esc(p.id)}" title="Retirer ${esc(p.nom)}" aria-label="Retirer ${esc(p.nom)}">✕</button></td>
                  </tr>`).join("")}
              </tbody>
            </table>
            <datalist id="liste-branches">${branches().map((b) => `<option value="${esc(b)}">`).join("")}</datalist>
          </div>
          <form class="ajout" id="form-ajout">
            <input id="ajout-nom" placeholder="Prénom" required aria-label="Prénom du nouveau participant">
            <input id="ajout-branche" placeholder="Branche" list="liste-branches" required aria-label="Branche">
            <select id="ajout-gen" aria-label="Génération">${Object.entries(GENERATIONS).map(([g, l]) => `<option value="${g}" ${g === "3" ? "selected" : ""}>${g} · ${l}</option>`).join("")}</select>
            <button class="bouton">+ Ajouter</button>
          </form>
        </section>

        <section class="carte">
          <h2>3. Les règles du tirage</h2>
          <label class="regle"><input type="checkbox" data-r="conjoint" ${o.regles.conjoint ? "checked" : ""}> Jamais à son conjoint</label>
          <label class="regle"><span>Familles (branches)</span>
            <select data-r="branche">
              <option value="preference" ${o.regles.branche === "preference" ? "selected" : ""}>Offrir à une autre branche, autant que possible</option>
              <option value="stricte" ${o.regles.branche === "stricte" ? "selected" : ""}>Toujours à une autre branche (obligatoire)</option>
              <option value="ignorer" ${o.regles.branche === "ignorer" ? "selected" : ""}>Peu importe</option>
            </select></label>
          <label class="regle"><span>Générations</span>
            <select data-r="generation">
              <option value="preference" ${o.regles.generation === "preference" ? "selected" : ""}>Mélanger les générations autant que possible</option>
              <option value="ignorer" ${o.regles.generation === "ignorer" ? "selected" : ""}>Peu importe</option>
            </select></label>
          <label class="regle"><span>Échanges A ↔ B</span>
            <select data-r="reciproque">
              <option value="preference" ${o.regles.reciproque === "preference" ? "selected" : ""}>Éviter autant que possible</option>
              <option value="stricte" ${o.regles.reciproque === "stricte" ? "selected" : ""}>Interdire</option>
              <option value="ignorer" ${o.regles.reciproque === "ignorer" ? "selected" : ""}>Peu importe</option>
            </select></label>
        </section>

        <section class="carte">
          <h2>4. Le tirage au sort</h2>
          ${o.tirage ? `
            ${perime ? `<div class="alerte">⚠️ La famille a été modifiée depuis ce tirage. Refaites un tirage et renvoyez les nouveaux liens.</div>` : ""}
            <p class="succes">🎲 Tirage fait le ${esc(new Date(o.tirage.fait).toLocaleString("fr-FR"))}.</p>
            <p class="petit">${statsHtml(o.tirage.stats)}</p>
            <p class="note">🤫 Cette page n'affiche jamais qui offre à qui. Envoyez à chacun <b>son</b> lien. Si vous participez, n'ouvrez que le vôtre !</p>
            <ul class="liens">
              ${o.participants.filter((p) => o.tirage.codes[p.id]).map((p) => `
                <li>
                  <span class="nom">${esc(p.nom)}</span>
                  <span class="boutons">
                    <a class="bouton petit whatsapp" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(messageLien(p, o))}">WhatsApp</a>
                    <button class="bouton petit secondaire" data-copier="${esc(p.id)}">Copier le lien</button>
                  </span>
                </li>`).join("")}
            </ul>
            <button class="bouton secondaire" id="tout-copier">Copier tous les messages</button>
            <button class="bouton danger" id="retirer">Refaire le tirage</button>
          ` : `
            <p class="petit">Vérifiez la famille et les règles, puis lancez le tirage. Personne (pas même vous) ne verra le résultat ici.</p>
            <button class="bouton large" id="tirer">🎲 Lancer le tirage au sort</button>
          `}
          <div id="erreur-tirage"></div>
        </section>

        <section class="carte">
          <h2>5. Les souhaits <span class="compteur">${nbSouhaits}/${o.participants.length}</span></h2>
          <p class="petit">Chacun choisit son souhait sur sa page et vous l'envoie par message. Collez ici les messages reçus (même plusieurs d'un coup) :</p>
          <textarea id="coller" rows="3" placeholder="#SOUHAIT g=… type=…"></textarea>
          <button class="bouton secondaire" id="importer">Ajouter les souhaits collés</button>
          <div id="retour-import"></div>
          <div class="tableau-wrap">
            <table class="tableau">
              <thead><tr><th>Prénom</th><th>Souhait</th><th>Précision</th></tr></thead>
              <tbody>
                ${o.participants.map((p) => {
                  const s = o.souhaits[p.id] || {};
                  return `<tr data-id="${esc(p.id)}">
                    <td>${esc(p.nom)}</td>
                    <td><select data-s="type" aria-label="Souhait de ${esc(p.nom)}"><option value="">— pas encore —</option>
                      ${Object.entries(SOUHAITS).map(([k, d]) => `<option value="${k}" ${s.type === k ? "selected" : ""}>${d.emoji} ${esc(d.label)}</option>`).join("")}
                    </select></td>
                    <td><input data-s="precision" value="${esc(s.precision)}" aria-label="Précision pour ${esc(p.nom)}"></td>
                  </tr>`;
                }).join("")}
              </tbody>
            </table>
          </div>
        </section>

        <section class="carte">
          <h2>6. Publier sur le site</h2>
          <p class="petit">Les souhaits et la famille sont lus par tout le monde depuis le fichier <code>data/famille.json</code> du dépôt GitHub. Après chaque changement (nouveaux souhaits…) :</p>
          <ol class="etapes petit">
            <li>Téléchargez le fichier ci-dessous (il ne contient <b>pas</b> le résultat du tirage).</li>
            <li>Sur GitHub, ouvrez le dossier <code>data</code> → <b>Add file › Upload files</b> → déposez <code>famille.json</code> → <b>Commit changes</b>.</li>
            <li>Une à deux minutes plus tard, le site est à jour.</li>
          </ol>
          <button class="bouton large" id="exporter">⬇️ Télécharger famille.json</button>
          <details class="avance">
            <summary>Sauvegarde, autre appareil…</summary>
            <p class="petit">La sauvegarde complète contient aussi les liens du tirage : gardez-la pour vous (ne la publiez pas).</p>
            <div class="boutons">
              <button class="bouton secondaire" id="sauvegarde">Télécharger une sauvegarde complète</button>
              <label class="bouton secondaire">Restaurer une sauvegarde<input type="file" id="restaurer" accept="application/json" hidden></label>
              <button class="bouton danger" id="reinit">Repartir du fichier publié</button>
            </div>
          </details>
        </section>
        <p class="centre"><a class="lien-discret" href="#/">← Accueil</a></p>`;

      brancher();
    }

    function statsHtml(s) {
      if (!s) return "";
      const pl = (n, m, pluriel) => `${n} ${n > 1 ? pluriel : m}`;
      return `Qualité du mélange : ${pl(s.memeBranche, "cadeau", "cadeaux")} dans la même branche, ${pl(s.memeGeneration, "cadeau", "cadeaux")} dans la même génération, ${pl(s.reciproques, "échange réciproque", "échanges réciproques")}.`;
    }

    function messageLien(p, o) {
      return `🎅 Coucou ${p.nom} ! Voici ton lien personnel pour le Secret Santa « ${o.titre} » : découvre à qui tu offres un cadeau et indique ton souhait.\n👉 ${urlPersonnelle(o.tirage.codes[p.id])}\n🤫 Garde-le pour toi !`;
    }

    function brancher() {
      // événement
      app.querySelectorAll("[data-k]").forEach((inp) => (inp.onchange = () => {
        const [a, b] = inp.dataset.k.split(".");
        if (b) o[a][b] = inp.value; else o[a] = inp.value;
        sauver();
      }));
      // participants
      app.querySelectorAll("tr[data-id] [data-f]").forEach((inp) => (inp.onchange = () => {
        const p = o.participants.find((x) => x.id === inp.closest("tr").dataset.id);
        const f = inp.dataset.f;
        if (f === "conjoint") {
          const ancien = p.conjoint;
          if (ancien) { const a = o.participants.find((x) => x.id === ancien); if (a) a.conjoint = null; }
          p.conjoint = inp.value || null;
          if (p.conjoint) {
            const c = o.participants.find((x) => x.id === p.conjoint);
            if (c.conjoint) { const cc = o.participants.find((x) => x.id === c.conjoint); if (cc) cc.conjoint = null; }
            c.conjoint = p.id;
          }
        } else if (f === "generation") p.generation = Number(inp.value);
        else p[f] = inp.value.trim();
        sauver(); rendu();
      }));
      app.querySelectorAll("[data-suppr]").forEach((b) => (b.onclick = () => {
        const id = b.dataset.suppr;
        const p = o.participants.find((x) => x.id === id);
        if (!confirm(`Retirer ${p.nom} du Secret Santa ?`)) return;
        o.participants = o.participants.filter((x) => x.id !== id);
        o.participants.forEach((x) => { if (x.conjoint === id) x.conjoint = null; });
        delete o.souhaits[id];
        sauver(); rendu();
      }));
      document.getElementById("form-ajout").onsubmit = (e) => {
        e.preventDefault();
        const nom = document.getElementById("ajout-nom").value.trim();
        const branche = document.getElementById("ajout-branche").value.trim();
        if (!nom || !branche) return;
        const id = slug(nom, new Set(o.participants.map((p) => p.id)));
        o.participants.push({ id, nom, branche, generation: Number(document.getElementById("ajout-gen").value), conjoint: null });
        sauver(); rendu();
        document.getElementById("ajout-nom").focus();
      };
      // règles
      app.querySelectorAll("[data-r]").forEach((inp) => (inp.onchange = () => {
        o.regles[inp.dataset.r] = inp.type === "checkbox" ? inp.checked : inp.value;
        sauver();
      }));
      // tirage
      const bTirer = document.getElementById("tirer");
      if (bTirer) bTirer.onclick = faireTirage;
      const bRetirer = document.getElementById("retirer");
      if (bRetirer) bRetirer.onclick = () => {
        if (!confirm("Refaire le tirage ? Les liens déjà envoyés ne seront plus valables : il faudra renvoyer les nouveaux à tout le monde.")) return;
        faireTirage();
      };
      app.querySelectorAll("[data-copier]").forEach((b) => (b.onclick = () =>
        copier(urlPersonnelle(o.tirage.codes[b.dataset.copier]), b)));
      const bTout = document.getElementById("tout-copier");
      if (bTout) bTout.onclick = () => copier(o.participants.filter((p) => o.tirage.codes[p.id]).map((p) => messageLien(p, o)).join("\n\n"), bTout);
      // souhaits
      app.querySelectorAll("tr[data-id] [data-s]").forEach((inp) => (inp.onchange = () => {
        const id = inp.closest("tr").dataset.id;
        const s = o.souhaits[id] || { type: "", precision: "" };
        s[inp.dataset.s] = inp.value.trim();
        if (s.type) o.souhaits[id] = s; else delete o.souhaits[id];
        sauver(); rendu();
      }));
      document.getElementById("importer").onclick = () => {
        const texte = document.getElementById("coller").value;
        const re = /#SOUHAIT\s+g=(\S+)\s+type=(\w+)(?:\s*\|\s*([^\n]*))?/g;
        const ok = [], inconnus = [];
        let m;
        while ((m = re.exec(texte))) {
          const p = o.participants.find((x) => x.id === m[1]);
          if (!p || !SOUHAITS[m[2]]) { inconnus.push(m[1]); continue; }
          o.souhaits[p.id] = { type: m[2], precision: (m[3] || "").trim() };
          ok.push(p.nom);
        }
        sauver(); rendu();
        document.getElementById("retour-import").innerHTML =
          (ok.length ? `<p class="succes">✅ Souhait ajouté pour : ${esc(ok.join(", "))}. Pensez à publier (étape 6).</p>` : `<p class="alerte">Aucun souhait reconnu. Collez le message complet, avec la ligne « #SOUHAIT … ».</p>`) +
          (inconnus.length ? `<p class="alerte">Personnes inconnues : ${esc(inconnus.join(", "))}</p>` : "");
      };
      // export / sauvegarde
      document.getElementById("exporter").onclick = () => telecharger("famille.json", versPublie(o));
      document.getElementById("sauvegarde").onclick = () => telecharger("secret-santa-sauvegarde.json", o);
      document.getElementById("restaurer").onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          const lu = JSON.parse(await f.text());
          if (!Array.isArray(lu.participants)) throw new Error();
          Object.keys(o).forEach((k) => delete o[k]);
          Object.assign(o, depuisPublie(lu), lu.tirage && lu.tirage.codes ? { tirage: lu.tirage } : {});
          sauver(); rendu();
        } catch { alert("Ce fichier n'est pas une sauvegarde valide."); }
      };
      document.getElementById("reinit").onclick = async () => {
        if (!confirm("Effacer les données de cet appareil (y compris les liens du tirage) et recharger le fichier publié ?")) return;
        publie = null;
        const d = await chargerPublie();
        const neuf = depuisPublie(d);
        Object.keys(o).forEach((k) => delete o[k]);
        Object.assign(o, neuf);
        sauver(); rendu();
      };
    }

    function faireTirage() {
      const err = document.getElementById("erreur-tirage");
      const manquants = o.participants.filter((p) => !p.nom || !p.branche);
      if (manquants.length) {
        err.innerHTML = `<p class="alerte">Chaque participant doit avoir un prénom et une branche.</p>`;
        return;
      }
      const res = Tirage.tirer(o.participants, o.regles);
      if (!res.ok) { err.innerHTML = `<p class="alerte">${esc(res.erreur)}</p>`; return; }
      const id = Date.now().toString(36);
      const parId = Object.fromEntries(o.participants.map((p) => [p.id, p]));
      const codes = {};
      for (const [g, r] of Object.entries(res.attributions)) {
        codes[g] = brouiller({
          v: 1, t: id, g, gn: parId[g].nom, r, rn: parId[r].nom,
          s: o.souhaits[r] || null,
          ti: o.titre, dt: o.date, b: o.budget,
          on: o.organisateur.nom, tel: o.organisateur.telephone
        });
      }
      o.tirage = { id, fait: new Date().toISOString(), codes, stats: res.stats, empreinte: empreinte(o.participants) };
      sauver(); rendu();
      confettis();
    }

    rendu();
  }

  function telecharger(nom, obj) {
    const blob = new Blob([JSON.stringify(obj, null, 2) + "\n"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  route();
})();
