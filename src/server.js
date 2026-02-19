const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 🟢 Route Health Check (pour Kubernetes)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Collector API fonctionne !' });
});

// --- 📦 ROUTES DU CATALOGUE ---

// 1. Récupérer tous les articles (GET)
app.get('/api/articles', async (req, res) => {
    try {
        const allArticles = await db.query('SELECT * FROM articles ORDER BY created_at DESC');
        res.status(200).json(allArticles.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des articles' });
    }
});

// 2. Ajouter un nouvel article (POST)
app.post('/api/articles', async (req, res) => {
    try {
        const { title, description, price } = req.body;

        // On insère l'objet et on demande à PostgreSQL de nous renvoyer la ligne créée (RETURNING *)
        const newArticle = await db.query(
            'INSERT INTO articles (title, description, price) VALUES ($1, $2, $3) RETURNING *',
            [title, description, price]
        );

        res.status(201).json(newArticle.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur lors de la création de l\'article' });
    }
});

// Lancement du serveur
app.listen(port, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${port}`);
});