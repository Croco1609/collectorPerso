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
    'auth-server-url': 'http://localhost:8080',
    resource: 'collector-front',
    'public-client': true
});

app.use(keycloak.middleware());

// --- 📦 ROUTES ---

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

// Nouvelle route pour récupérer les articles d'un utilisateur spécifique
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

app.listen(port, () => {
    console.log(`🚀 Serveur sécurisé sur http://localhost:${port}`);
});