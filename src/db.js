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
        // Correction de la détection de la table
        const checkTable = await pool.query("SELECT to_regclass('public.articles') as table_exists");

        // On vérifie si la valeur retournée est null
        if (process.env.DB_FORCE_RESTART === 'true') {
            if (checkTable.rows[0].table_exists) {
                await pool.query(`DROP TABLE IF EXISTS articles`);
                console.log('🏗:construction: DROP de la table "articles"...');
            }
              console.log('🏗️ Création de la table "articles"...');
            await pool.query(`
                CREATE TABLE articles (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    image_url TEXT,
                    price DECIMAL(10, 2) NOT NULL,
                    seller_id VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            `);
            console.log('✅ Table "articles" créée avec succès !');
        } else {
            console.log("ℹ️ Base de données déjà initialisée.");
        }
    } catch (err) {
        console.error("❌ Erreur lors de l'initialisation de la DB :", err.message);
    }
};

pool.on('connect', () => {
    console.log('✅ Connecté à PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Erreur PostgreSQL', err);
});

let initPromise = Promise.resolve(); // Promesse résolue par défaut

if (process.env.DB_FORCE_RESTART === 'true' || process.env.NODE_ENV === 'test' || process.env.CI === 'true') {
    initPromise = initDB(); // On capture la promesse d'initialisation
} else {
    console.log('ℹ️  Saut de l\'initialisation de la base de données (mode persistant).');
}

// On attache la promesse au pool pour pouvoir l'attendre dans les tests
pool.ready = initPromise;

module.exports = pool;