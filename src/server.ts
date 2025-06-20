// Import des dépendances
import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import axios from "axios";

// Chargement des variables d'environnement
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5077;

// Tokens Meta
const VERIFY_TOKEN       = process.env.TOKEN_VERIFY_FACEBOOK;
const PAGE_ACCESS_TOKEN  = process.env.PAGE_ACCESS_TOKEN;

// Middleware pour parser les requêtes JSON
app.use(bodyParser.json());

// ——————————————————————————————————————————
// 1. Fonction pour whitelister vos domaines
// ——————————————————————————————————————————
async function whitelistDomains() {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/me/messenger_profile`,
      {
        whitelisted_domains: [
          "https://spiffy-licorice-8c36db.netlify.app",
          // ajoutez ici d'autres domaines si besoin
        ]
      },
      {
        params: { access_token: PAGE_ACCESS_TOKEN }
      }
    );
    console.log("✅ Domains whitelistés:", response.data);
  } catch (err:any) {
    console.error("❌ Erreur whitelistage:", err.response?.data || err);
  }
}

// Appel au démarrage pour whitelister vos domaines
whitelistDomains();

// ——————————————————————————————————————————
// 2. Webhook Messenger
// ——————————————————————————————————————————

// Vérification du webhook (GET)
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook vérifié");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Réception des messages (POST)
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object === "page") {
    for (const entry of body.entry) {
      const event    = entry.messaging[0];
      const senderId = event.sender.id;

      if (event.message?.text) {
        await sendWebviewButton(senderId);
      }
    }
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// ——————————————————————————————————————————
// 3. Fonctions utilitaires
// ——————————————————————————————————————————

async function sendMessage(recipientId:any, messagePayload:any) {
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        recipient: { id: recipientId },
        message:   messagePayload,
      }
    );
    console.log("✅ Message envoyé:", response.data);
  } catch (error:any) {
    console.error("❌ Erreur envoi message:", error.response?.data || error);
  }
}

async function sendWebviewButton(recipientId:any) {
  const message = {
    attachment: {
      type: "template",
      payload: {
        template_type: "button",
        text: "Cliquez sur le bouton pour accéder à notre site :",
        buttons: [
          {
            type: "web_url",
            url: "https://spiffy-licorice-8c36db.netlify.app",
            title: "Voir le site",
            webview_height_ratio: "full",
            messenger_extensions: true,
            fallback_url: "https://spiffy-licorice-8c36db.netlify.app",
          },
        ],
      },
    },
  };

  await sendMessage(recipientId, message);
}

// ——————————————————————————————————————————
// 4. Démarrage du serveur
// ——————————————————————————————————————————
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log("🔗 Webhook URL: https://<votre-ngrok-url>/webhook");
});
