const express = require('express');
const cors = require('cors');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
require('dotenv').config();
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = require('prom-client'); // Importation du client Prometheus

// 1. Collecte des métriques par défaut (CPU, Mémoire, etc.)
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ register: client.register });

// 2. Création d'une métrique personnalisée pour compter les requêtes HTTP
const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durée des requêtes HTTP en secondes',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5]
});

// Middleware pour enregistrer la durée de chaque requête
app.use((req, res, next) => {
    const end = httpRequestDurationMicroseconds.startTimer();
    res.on('finish', () => {
        end({ method: req.method, route: req.path, code: res.statusCode });
    });
    next();
});

// 3. Nouvelle route pour exposer les métriques (Prometheus viendra lire ici)
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

// 1. Configuration de la session (nécessaire pour Keycloak)
const memoryStore = new session.MemoryStore(); // Stockage en mémoire pour le développement
app.use(session({
    secret: 'une_cle_secrete_tres_longue',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));

// 2. Configuration du "Vigile" Keycloak
const keycloak = new Keycloak({ store: memoryStore }, {
    realm: 'collector-realm',
    'auth-server-url': process.env.KEYCLOAK_AUTH_URL || 'http://localhost:8080',
    resource: 'collector-front',
    'public-client': true
});

app.use(keycloak.middleware());

// --- 📦 ROUTES ---

// Route par défaut pour l'accueil
app.get('/', (req, res) => {
    res.send('<h1>Bienvenue sur l\'API Collector ! 🚀</h1><p>Les routes disponibles sont /health, /api/articles, etc.</p>');
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

app.get('/api/articles', async (req, res) => {
    try {
        const allArticles = await db.query('SELECT * FROM articles ORDER BY created_at DESC');
        res.status(200).json(allArticles.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des articles' });
    }
});

// 3. 🔐 ROUTE SÉCURISÉE : On ajoute "keycloak.protect()"
app.post('/api/articles', keycloak.protect(), async (req, res) => {
    try {
        const { title, description, price, image_url } = req.body;

        // On récupère l'identifiant unique de l'utilisateur depuis son badge !
        const seller_id = req.kauth.grant.access_token.content.sub;

        const newArticle = await db.query(
            'INSERT INTO articles (title, description, price, image_url, seller_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, description, price, image_url, seller_id]
        );

        res.status(201).json(newArticle.rows[0]);
    } catch (err) {
        console.error("Erreur sécurité/DB:", err.message);
        res.status(403).json({ error: 'Accès refusé ou erreur serveur' });
    }
});

// 3. 🔐 ROUTE SÉCURISÉE : On ajoute "keycloak.protect()"
app.delete('/api/articles/:id', keycloak.protect(), async (req, res) => {
    try {
        const { id } = req.params;
        const seller_id = req.kauth.grant.access_token.content.sub;

        const deleteArticle = await db.query('DELETE FROM articles WHERE id = $1 AND seller_id = $2 RETURNING *', [id, seller_id]);
        if (deleteArticle.rows.length === 0) {
            return res.status(404).json({ error: 'Article non trouvé ou vous n\'êtes pas autorisé à le supprimer' });
        }
        res.status(200).json({ message: 'Article supprimé avec succès' });
    } catch (err) {
        console.error("Erreur sécurité/DB:", err.message);
        res.status(403).json({ error: 'Accès refusé ou erreur serveur' });
    }
});

// 3. 🔐 ROUTE SÉCURISÉE : On ajoute "keycloak.protect()"
app.put('/api/articles/:id', keycloak.protect(), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, image_url } = req.body;
        const seller_id = req.kauth.grant.access_token.content.sub;

        const updateArticle = await db.query(
            'UPDATE articles SET title = $1, description = $2, price = $3, image_url = $4 WHERE id = $5 AND seller_id = $6 RETURNING *',
            [title, description, price, image_url, id, seller_id]
        );

        if (updateArticle.rows.length === 0) {
            return res.status(404).json({ error: 'Article non trouvé ou vous n\'êtes pas autorisé à le modifier' });
        }

        res.status(200).json(updateArticle.rows[0]);
    } catch (err) {
        console.error("Erreur sécurité/DB:", err.message);
        res.status(403).json({ error: 'Accès refusé ou erreur serveur' });
    }
});

// Route pour récupérer les articles d'un utilisateur spécifique
app.get('/api/my-articles', keycloak.protect(), async (req, res) => {
    try {
        const seller_id = req.kauth.grant.access_token.content.sub;
        const myArticles = await db.query(
            'SELECT * FROM articles WHERE seller_id = $1 ORDER BY created_at DESC',
            [seller_id]
        );
        res.status(200).json(myArticles.rows);
    } catch (err) {
        console.error("Erreur lors de la récupération de mes articles:", err.message);
        res.status(500).json({ error: 'Erreur lors de la récupération de vos articles' });
    }
});

// Création d'une jauge personnalisée
const articlesCountGauge = new client.Gauge({
    name: 'collector_total_articles',
    help: 'Nombre total d\'articles en vente dans la boutique'
});

// Fonction pour mettre à jour la valeur depuis la DB
const updateMetrics = async () => {
    try {
        const result = await db.query('SELECT COUNT(*) FROM articles');
        articlesCountGauge.set(parseInt(result.rows[0].count));
    } catch (err) {
        console.error("Erreur mise à jour métriques:", err.message);
    }
};

// On met à jour toutes les 5 secondes
setInterval(updateMetrics, 5000);

if (require.main === module) {
    app.listen(port, () => {
        console.log(`🚀 Serveur sécurisé sur http://localhost:${port}`);
    });
}

module.exports = app;