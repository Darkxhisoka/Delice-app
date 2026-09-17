import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getUsers, getOrCreateUser } from "./src/db/users.ts";

async function startServer() {
  const app = express();
  const PORT = 3001;

  app.use(express.json({ limit: "10mb" }));

  // Health check endpoints for Cloud Run ingress and container probes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.get("/healthz", (req, res) => {
    res.status(200).send("OK");
  });

  // Cloud SQL User endpoints protected by Firebase Auth
  app.get("/api/users", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userList = await getUsers();
      res.json(userList);
    } catch (error: any) {
      console.error("Failed to fetch users from Cloud SQL:", error);
      res.status(500).json({ error: error.message || "Failed to fetch users" });
    }
  });

  app.post("/api/users/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || req.body?.email;
      const displayName = req.body?.displayName;
      const role = req.body?.role;

      if (!uid || !email) {
        return res.status(400).json({ error: "Missing uid or email for user synchronization" });
      }

      const syncedUser = await getOrCreateUser(uid, email, displayName, role);
      res.json(syncedUser);
    } catch (error: any) {
      console.error("Failed to sync user to Cloud SQL:", error);
      res.status(500).json({ error: error.message || "Failed to sync user" });
    }
  });

  // API Endpoint for Lab Contextual Assistant Chatbot
  app.post("/api/chat", async (req, res) => {
    try {
      const { prompt, history, context } = req.body;

      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Le message (prompt) est requis." });
      }

      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        // Fallback response if GEMINI_API_KEY is missing
        return res.json({
          text: `### 👨‍🍳 Chef Émile (Mode Guidance d'Urgence)\n\nBonjour ! Je suis **Chef Émile**, l'assistant du Laboratoire Central de Pâtisserie le Délice.\n\nVous avez demandé : *"${prompt}"*\n\nVoici les repères fondamentaux du Laboratoire :\n\n- **Flux des Requisitions** : Les boutiques émettent leurs besoins -> Le lab valide -> Lancement en production -> Colisage & Livraison.\n- **Cascade de Production** : Préparez d'abord les sous-lots (pâtes, sous-recettes, crémeux), puis assemblez les gâteaux finis.\n- **Résolution d'Urgence (Ganache Tranchée)** : Réchauffez doucement au bain-marie à 35°C et émulsionnez au mixeur plongeant, ou ajoutez un trait de lait tiède.\n- **Résolution d'Urgence (Pâte Feuilletée)** : Laissez reposer 30 min au frais entre chaque tour pour éviter le retrait à la cuisson.\n\n*(Astuce: Associez une clé GEMINI_API_KEY valide dans Settings > Secrets pour débloquer les réponses personnalisées en temps réel).*`
        });
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const systemInstruction = `Vous êtes 'Chef Émile', le maître pâtissier virtuel et assistant IA du Laboratoire Central de 'Pâtisserie le Délice'.
Votre rôle est d'accompagner les nouveaux employés, apprentis, pâtissiers et responsables de magasin.

Vos domaines d'expertise :
1. **Flux de Travail du Lab (Lab Workflows)** :
   - Traitement des requisitions/commandes récurrentes ou urgentes des boutiques.
   - Saisie des réceptions de matières premières (scan code-barres / douchette).
   - Gestion des stocks en méthode FIFO (Premier Entré, Premier Sorti) et alertes péremption.
   - Création et gestion des fiches techniques (Recettes Sous-lots et Produits Finis).
   - Calcul des coûts de revient et simulation des prix de vente.
   - Exécution de la production via le Production Runner (Cascade de production : préparation des sous-recettes puis assemblage).
   - Enregistrement des pertes, gâchis et avaries.

2. **Dépannage & Erreurs de Pâtisserie Courantes (Troubleshooting)** :
   - Ganache qui tranche ou se sépare -> Réémulsionner avec un peu de liquide tiède ou mixeur plongeant.
   - Crème chantilly/fouettée surbattue ou graissée -> Ajouter un trait de crème liquide froide et retravailler doucement.
   - Pâte levée / brioche qui ne lève pas -> Vérifier la température du lait/beurre (trop chaud tue la levure) et le taux d'hydratation.
   - Macarons sans collerette ou craquelés -> Vérifier la macaronage, le croûtage à l'air libre et l'humidité du four.
   - Pâte feuilletée qui se rétracte -> Respecter les temps de repos au frais (30 min minimum) entre les tours.
   - Gélification insuffisante -> Vérifier l'hydratation de la gélatine (poudre 1:6) et ne jamais bouillir l'agar-agar exagérément.

3. **Prise en main de l'application web** :
   - Expliquer où trouver les onglets, comment filtrer par boutique, comment ajuster les stocks ou imprimer les bons de colisage.

Consignes de style :
- Répondez en français impeccable, avec un ton passionné, courtois, très clair et professionnel.
- Utilisez une mise en page Markdown riche (titres H3, puces, textes en gras, blocs d'astuces "💡 Conseil du Chef").
- Soyez concis mais complet.

Contexte actuel fourni par l'utilisateur: ${context || 'Utilisateur dans l\'interface générale du Laboratoire Central.'}`;

      const contents = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const msg of history) {
          contents.push({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          });
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: prompt }],
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      return res.json({ text: response.text || "Désolé, aucune réponse n'a pu être générée." });
    } catch (err: unknown) {
      console.error("Gemini API Error in /api/chat:", err);
      const errorMessage = err instanceof Error ? err.message : "Erreur interne.";
      return res.status(500).json({
        error: "Erreur lors de la communication avec l'assistant Gemini.",
        details: errorMessage,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
