const { Pool } = require('pg');
require('dotenv').config();

// 1. IL NE FAUT PAS OUBLIER CETTE PARTIE : La création de la connexion
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// 2. La fonction d'initialisation de la base
const initDB = async () => {
    try {
        // ⚠️ On supprime la table existante (pratique pour le dev local)
        await pool.query('DROP TABLE IF EXISTS articles;');

        // On recrée la table avec le fameux "seller_id" pour Keycloak et "image_url"
        await pool.query(`
      CREATE TABLE articles (
        id SERIAL   PRIMARY KEY,
        title       VARCHAR(255)   NOT NULL,
        description TEXT,
        price       DECIMAL(10, 2) NOT NULL,
        image_url   TEXT,
        seller_id   VARCHAR(255), 
        created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Table "articles" recréée avec le support Keycloak et Images !');
    } catch (err) {
        console.error('❌ Erreur lors de la création de la table :', err);
    }
};

pool.on('connect', () => {
    console.log('✅ Connecté à PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Erreur PostgreSQL', err);
});

if (process.env.DB_FORCE_RESTART === 'true') {
    initDB();
} else {
    console.log('ℹ️  Saut de l\'initialisation de la base de données (mode persistant).');
}

module.exports = pool;