var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json({ limit: "10mb" }));
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history, context } = req.body;
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Le message (prompt) est requis." });
      }
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.json({
          text: `### \u{1F468}\u200D\u{1F373} Chef \xC9mile (Mode Guidance d'Urgence)

Bonjour ! Je suis **Chef \xC9mile**, l'assistant du Laboratoire Central de P\xE2tisserie le D\xE9lice.

Vous avez demand\xE9 : *"${prompt}"*

Voici les rep\xE8res fondamentaux du Laboratoire :

- **Flux des Requisitions** : Les boutiques \xE9mettent leurs besoins -> Le lab valide -> Lancement en production -> Colisage & Livraison.
- **Cascade de Production** : Pr\xE9parez d'abord les sous-lots (p\xE2tes, sous-recettes, cr\xE9meux), puis assemblez les g\xE2teaux finis.
- **R\xE9solution d'Urgence (Ganache Tranch\xE9e)** : R\xE9chauffez doucement au bain-marie \xE0 35\xB0C et \xE9mulsionnez au mixeur plongeant, ou ajoutez un trait de lait ti\xE8de.
- **R\xE9solution d'Urgence (P\xE2te Feuillet\xE9e)** : Laissez reposer 30 min au frais entre chaque tour pour \xE9viter le retrait \xE0 la cuisson.

*(Astuce: Associez une cl\xE9 GEMINI_API_KEY valide dans Settings > Secrets pour d\xE9bloquer les r\xE9ponses personnalis\xE9es en temps r\xE9el).*`
        });
      }
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const systemInstruction = `Vous \xEAtes 'Chef \xC9mile', le ma\xEEtre p\xE2tissier virtuel et assistant IA du Laboratoire Central de 'P\xE2tisserie le D\xE9lice'.
Votre r\xF4le est d'accompagner les nouveaux employ\xE9s, apprentis, p\xE2tissiers et responsables de magasin.

Vos domaines d'expertise :
1. **Flux de Travail du Lab (Lab Workflows)** :
   - Traitement des requisitions/commandes r\xE9currentes ou urgentes des boutiques.
   - Saisie des r\xE9ceptions de mati\xE8res premi\xE8res (scan code-barres / douchette).
   - Gestion des stocks en m\xE9thode FIFO (Premier Entr\xE9, Premier Sorti) et alertes p\xE9remption.
   - Cr\xE9ation et gestion des fiches techniques (Recettes Sous-lots et Produits Finis).
   - Calcul des co\xFBts de revient et simulation des prix de vente.
   - Ex\xE9cution de la production via le Production Runner (Cascade de production : pr\xE9paration des sous-recettes puis assemblage).
   - Enregistrement des pertes, g\xE2chis et avaries.

2. **D\xE9pannage & Erreurs de P\xE2tisserie Courantes (Troubleshooting)** :
   - Ganache qui tranche ou se s\xE9pare -> R\xE9\xE9mulsionner avec un peu de liquide ti\xE8de ou mixeur plongeant.
   - Cr\xE8me chantilly/fouett\xE9e surbattue ou graiss\xE9e -> Ajouter un trait de cr\xE8me liquide froide et retravailler doucement.
   - P\xE2te lev\xE9e / brioche qui ne l\xE8ve pas -> V\xE9rifier la temp\xE9rature du lait/beurre (trop chaud tue la levure) et le taux d'hydratation.
   - Macarons sans collerette ou craquel\xE9s -> V\xE9rifier la macaronage, le cro\xFBtage \xE0 l'air libre et l'humidit\xE9 du four.
   - P\xE2te feuillet\xE9e qui se r\xE9tracte -> Respecter les temps de repos au frais (30 min minimum) entre les tours.
   - G\xE9lification insuffisante -> V\xE9rifier l'hydratation de la g\xE9latine (poudre 1:6) et ne jamais bouillir l'agar-agar exag\xE9r\xE9ment.

3. **Prise en main de l'application web** :
   - Expliquer o\xF9 trouver les onglets, comment filtrer par boutique, comment ajuster les stocks ou imprimer les bons de colisage.

Consignes de style :
- R\xE9pondez en fran\xE7ais impeccable, avec un ton passionn\xE9, courtois, tr\xE8s clair et professionnel.
- Utilisez une mise en page Markdown riche (titres H3, puces, textes en gras, blocs d'astuces "\u{1F4A1} Conseil du Chef").
- Soyez concis mais complet.

Contexte actuel fourni par l'utilisateur: ${context || "Utilisateur dans l'interface g\xE9n\xE9rale du Laboratoire Central."}`;
      const contents = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }]
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: prompt }]
      });
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });
      return res.json({ text: response.text || "D\xE9sol\xE9, aucune r\xE9ponse n'a pu \xEAtre g\xE9n\xE9r\xE9e." });
    } catch (err) {
      console.error("Gemini API Error in /api/chat:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur interne.";
      return res.status(500).json({
        error: "Erreur lors de la communication avec l'assistant Gemini.",
        details: errorMessage
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
