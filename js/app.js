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
  const CLE_ORGA = "secretSanta.orga.v3";
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

  // ---------- données publiées ----------
  async function chargerPublie() {
    if (publie) return publie;
    try {
      const rep = await fetch("data/famille.json", { cache: "no-cache" });
      publie = rep.ok ? await rep.json() : {};
    } catch { publie = {}; }
    return publie;
  }

  // ---------- identité choisie (pour la durée de la visite) ----------
  const CLE_IDENTITE = "secretSanta.identite";
  let identite = null;
  function identiteConfirmee() {
    if (identite) return identite;
    try { return sessionStorage.getItem(CLE_IDENTITE); } catch { return null; }
  }
  function confirmerIdentite(id) {
    identite = id;
    try { sessionStorage.setItem(CLE_IDENTITE, id); } catch { /* indisponible */ }
    ecrire("secretSanta.dernierChoix", id);
  }
  function oublierIdentite() {
    identite = null;
    try { sessionStorage.removeItem(CLE_IDENTITE); } catch { /* indisponible */ }
  }

  // ---------- routeur ----------
  async function route() {
    const h = location.hash || "#/";
    window.scrollTo(0, 0);
    if (h.startsWith("#/moi/")) return pagePersonnelle(decodeURIComponent(h.slice(6)));
    if (h.startsWith("#/orga")) return pageOrga();
    return pageAccueil();
  }
  window.addEventListener("hashchange", route);

  const GROUPES = { 1: "Grands-parents", 2: "Enfants & conjoints", 3: "Petits-enfants & conjoints", 4: "Arrière-petits-enfants" };

  // =====================================================================
  // ACCUEIL : « Qui es-tu ? »
  // =====================================================================
  async function pageAccueil() {
    const d = await chargerPublie();
    const participants = d.participants || [];
    const dernier = lire("secretSanta.dernierChoix");
    const gens = [...new Set(participants.map((p) => Number(p.generation)))].sort();

    app.innerHTML = `
      <header class="entete">
        <div class="grand-emoji">🎅</div>
        <h1>${esc(d.titre || "Secret Santa en famille")}</h1>
        ${d.date ? `<p class="sous-titre">${esc(dateFr(d.date))}</p>` : ""}
      </header>
      <section class="carte">
        <form id="form-qui">
          <label class="champ">
            <span class="question">Qui es-tu ?</span>
            <select id="qui" required>
              <option value="">— Choisis ton prénom —</option>
              ${gens.map((g) => `<optgroup label="${esc(GROUPES[g] || "Génération " + g)}">
                ${participants.filter((p) => Number(p.generation) === g).map((p) =>
                  `<option value="${esc(p.id)}" ${p.id === dernier ? "selected" : ""}>${esc(p.nom)}</option>`).join("")}
              </optgroup>`).join("")}
            </select>
          </label>
          <button class="bouton large" id="valider-qui" ${participants.some((p) => p.id === dernier) ? "" : "disabled"}>C'est moi ! 🎄</button>
        </form>
      </section>
      <section class="carte">
        <h2>Comment ça marche ?</h2>
        <ol class="etapes">
          <li>Chacun offre <b>un seul cadeau</b>, tiré au sort, de préférence à quelqu'un d'une autre famille et d'une autre génération.</li>
          <li>Choisis ton prénom pour découvrir à qui tu fais un cadeau… et ce qui lui ferait plaisir.</li>
          <li>Indique toi aussi <b>ton souhait</b> : douceur, déco, fait main, surprise…</li>
        </ol>
        <p class="note">🤫 On compte sur toi : ne regarde que ton prénom !</p>
      </section>
      <p class="centre"><a class="lien-discret" href="#/orga">🔧 Espace organisateur</a></p>`;

    const sel = document.getElementById("qui");
    const btn = document.getElementById("valider-qui");
    sel.onchange = () => (btn.disabled = !sel.value);
    document.getElementById("form-qui").onsubmit = (e) => {
      e.preventDefault();
      const p = participants.find((x) => x.id === sel.value);
      if (p) ecranVerification(p);
    };
  }

  function ecranVerification(p) {
    app.innerHTML = `
      <section class="carte centre ecran-chargement">
        <div class="lutin" aria-hidden="true">🎁</div>
        <p class="chargement-texte">Les lutins cherchent ton espace…</p>
        <div class="barre"><span></span></div>
      </section>`;
    setTimeout(() => {
      app.innerHTML = `
        <section class="carte centre confirmation">
          <div class="grand-emoji">🤔</div>
          <h2>Es-tu sûr(e) d'être<br><span class="nom-confirme">${esc(p.nom)}</span> ?</h2>
          <p class="petit">Le Père Noël te fait confiance 😉</p>
          <div class="boutons centre-boutons">
            <button class="bouton" id="oui">Oui, c'est moi !</button>
            <button class="bouton secondaire" id="non">Non, revenir</button>
          </div>
        </section>`;
      document.getElementById("oui").onclick = () => {
        confirmerIdentite(p.id);
        location.hash = "#/moi/" + encodeURIComponent(p.id);
      };
      document.getElementById("non").onclick = () => pageAccueil();
      document.getElementById("oui").focus();
    }, 1600);
  }

  // =====================================================================
  // ESPACE PERSO
  // =====================================================================
  async function pagePersonnelle(id) {
    const d = await chargerPublie();
    const parId = Object.fromEntries((d.participants || []).map((p) => [p.id, p]));
    const moi = parId[id];
    if (!moi || identiteConfirmee() !== id) { location.hash = "#/"; return; }

    const attributions = (d.tirage && d.tirage.attributions) || {};
    const receveur = parId[attributions[id]] || null;
    const souhait = receveur ? texteSouhait(d.souhaits && d.souhaits[receveur.id]) : null;
    const cleVu = "secretSanta.vu." + (d.tirage && d.tirage.id) + "." + id;
    const dejaVu = lire(cleVu);

    app.innerHTML = `
      <header class="entete">
        <div class="grand-emoji">🎄</div>
        <h1>Bonjour ${esc(moi.nom)} !</h1>
        <p class="sous-titre">${esc(d.titre || "Secret Santa en famille")}</p>
        ${d.date ? `<p class="petit">${esc(dateFr(d.date))}</p>` : ""}
      </header>

      <section class="carte centre">
        <h2>Tu es le Secret Santa de…</h2>
        ${receveur ? `
        <div class="cadeau ${dejaVu ? "ouvert" : ""}" id="cadeau">
          <button class="cadeau-ferme" id="ouvrir" aria-label="Découvrir à qui j'offre un cadeau">
            <span class="paquet">🎁</span>
            <span>Touche le cadeau pour découvrir</span>
          </button>
          <div class="cadeau-ouvert">
            <div class="receveur">${esc(receveur.nom)}</div>
            <div class="souhait-receveur">
              ${souhait
                ? `<p class="petit">Son souhait :</p>
                   <p class="pastille">${souhait.emoji} ${esc(souhait.label)}</p>
                   ${souhait.precision ? `<p class="precision">« ${esc(souhait.precision)} »</p>` : ""}`
                : `<p class="petit">${esc(receveur.nom)} n'a pas encore donné de souhait. Reviens voir plus tard !</p>`}
            </div>
            ${d.budget ? `<p class="petit">Budget conseillé : <b>${esc(d.budget)}</b></p>` : ""}
            <p class="note">🤫 Chut, c'est un secret !</p>
          </div>
        </div>` : `
        <div class="grand-emoji">⏳</div>
        <p>Le tirage au sort n'a pas encore eu lieu.<br>Reviens dans quelques jours !</p>`}
      </section>

      <section class="carte" id="mon-souhait"></section>
      <p class="centre"><button class="lien-discret bouton-lien" id="changer">Ce n'est pas moi / changer de prénom</button></p>`;

    const ouvrir = document.getElementById("ouvrir");
    if (ouvrir) ouvrir.onclick = () => {
      document.getElementById("cadeau").classList.add("ouvert");
      ecrire(cleVu, true);
      confettis();
    };
    document.getElementById("changer").onclick = () => { oublierIdentite(); location.hash = "#/"; };
    blocMonSouhait({ g: moi.id, gn: moi.nom }, d);
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
      tirage: copie.tirage && copie.tirage.attributions ? copie.tirage : null
    };
  }
  function versPublie(o) {
    const out = {
      titre: o.titre, date: o.date, budget: o.budget,
      organisateur: o.organisateur, regles: o.regles,
      participants: o.participants, souhaits: o.souhaits
    };
    // Le tirage est publié : chacun le retrouve en choisissant son prénom.
    if (o.tirage) out.tirage = o.tirage;
    return out;
  }
  function empreinte(participants) {
    return participants.map((p) => [p.id, p.nom, p.branche, p.generation, p.conjoint || ""].join(":")).join("|");
  }

  async function pageOrga() {
    const o = await chargerOrga();
    let enLigne = await chargerPublie();
    const sauver = () => ecrire(CLE_ORGA, o);
    const branches = () => [...new Set(o.participants.map((p) => p.branche).filter(Boolean))];

    function rendu() {
      const parId = Object.fromEntries(o.participants.map((p) => [p.id, p]));
      const perime = o.tirage && o.tirage.empreinte !== empreinte(o.participants);
      const nbSouhaits = o.participants.filter((p) => o.souhaits[p.id]).length;
      const idEnLigne = enLigne.tirage && enLigne.tirage.id;
      const tiragePublie = o.tirage && idEnLigne === o.tirage.id;

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
            ${perime ? `<div class="alerte">⚠️ La famille a été modifiée depuis ce tirage. Refaites un tirage puis publiez-le.</div>` : ""}
            <p class="succes">🎲 Tirage fait le ${esc(new Date(o.tirage.fait).toLocaleString("fr-FR"))}.</p>
            <p class="petit">${statsHtml(o.tirage.stats)}</p>
            ${tiragePublie
              ? `<p class="succes">✅ Ce tirage est en ligne : chacun peut le découvrir en choisissant son prénom sur l'accueil.</p>`
              : `<div class="alerte">📤 Ce tirage n'est <b>pas encore en ligne</b>. Publiez le fichier (étape 6) pour que chacun puisse le découvrir.</div>`}
            <p class="note">🤫 Cette page n'affiche jamais qui offre à qui. Si vous participez, ne choisissez que votre prénom !</p>
            <button class="bouton danger" id="retirer">Refaire le tirage</button>
          ` : `
            <p class="petit">Vérifiez la famille et les règles, puis lancez le tirage. Personne (pas même vous) ne verra le résultat ici.</p>
            <button class="bouton large" id="tirer">🎲 Lancer le tirage au sort</button>
            ${idEnLigne ? `<p class="note">ℹ️ Un tirage est déjà en ligne sur le site, mais il n'est pas sur cet appareil. Utilisez « Repartir du fichier publié » (étape 6) pour le récupérer.</p>` : ""}
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
          <p class="petit">La famille, le tirage et les souhaits sont lus par tout le monde depuis le fichier <code>data/famille.json</code> du dépôt GitHub. Après chaque changement (tirage, nouveaux souhaits…) :</p>
          <ol class="etapes petit">
            <li>Téléchargez le fichier ci-dessous.</li>
            <li>Sur GitHub, ouvrez le dossier <code>data</code> → <b>Add file › Upload files</b> → déposez <code>famille.json</code> → <b>Commit changes</b>.</li>
            <li>Une à deux minutes plus tard, le site est à jour.</li>
          </ol>
          <button class="bouton large" id="exporter">⬇️ Télécharger famille.json</button>
          <details class="avance">
            <summary>Sauvegarde, autre appareil…</summary>
            <p class="petit">Pour reprendre l'organisation sur un autre appareil, ou revenir à la version en ligne.</p>
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
        if (!confirm("Refaire le tirage ? Il remplacera l\'ancien dès que vous l\'aurez publié : prévenez ceux qui ont déjà regardé.")) return;
        faireTirage();
      };
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
          Object.assign(o, depuisPublie(lu), lu.tirage && lu.tirage.attributions ? { tirage: lu.tirage } : {});
          sauver(); rendu();
        } catch { alert("Ce fichier n'est pas une sauvegarde valide."); }
      };
      document.getElementById("reinit").onclick = async () => {
        if (!confirm("Effacer les données de cet appareil et recharger le fichier publié ?")) return;
        publie = null;
        const d = await chargerPublie();
        enLigne = d;
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
      o.tirage = { id, fait: new Date().toISOString(), attributions: res.attributions, stats: res.stats, empreinte: empreinte(o.participants) };
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
