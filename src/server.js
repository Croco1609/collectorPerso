const express = require('express');
const cors = require('cors');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
require('dotenv').config();
const db = require('./db');
const packageJson = require('../package.json');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const client = require('prom-client');
client.collectDefaultMetrics({ register: client.register });

const httpRequestDurationMicroseconds = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durée des requêtes HTTP en secondes',
    labelNames: ['method', 'route', 'code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5]
});

app.use((req, res, next) => {
    const end = httpRequestDurationMicroseconds.startTimer();
    res.on('finish', () => end({ method: req.method, route: req.path, code: res.statusCode }));
    next();
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
});

const memoryStore = new session.MemoryStore();
app.use(session({
    secret: 'une_cle_secrete_tres_longue',
    resave: false,
    saveUninitialized: true,
    store: memoryStore
}));

const keycloak = new Keycloak({ store: memoryStore }, {
    realm: 'collector-realm',
    'auth-server-url': 'http://localhost/auth',
    resource: 'collector-front',
    'bearer-only': true,
    'ssl-required': 'none',
    'verify-token-audience': false,
    'realm-public-key': process.env.KEYCLOAK_PUBLIC_KEY
});

app.use(keycloak.middleware());

const articleRoutes = require('./routes/article.routes');

app.use('/api/articles', articleRoutes(keycloak));

app.get('/', (req, res) => {
    res.send('<h1>Bienvenue sur l\'API Collector !</h1><p>Les routes disponibles sont /health, /api/articles, etc.</p>');
});

app.get('/health', async (req, res) => {
    const healthcheck = {
        status: 'UP',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: packageJson.version || '1.0.0',
        dependencies: { database: 'UNKNOWN', keycloak: 'UNKNOWN' }
    };

    try {
        try {
            await db.query('SELECT 1');
            healthcheck.dependencies.database = 'UP';
        } catch (dbError) {
            healthcheck.dependencies.database = 'DOWN';
            healthcheck.status = 'DEGRADED';
        }

        try {
            if (process.env.NODE_ENV === 'test') {
                healthcheck.dependencies.keycloak = 'UP';
            } else {
                const kcResponse = await fetch('http://keycloak:8080/auth/health/ready');
                if (kcResponse.ok) {
                    healthcheck.dependencies.keycloak = 'UP';
                } else throw new Error(`Erreur HTTP: ${kcResponse.status}`);
            }
        } catch (kcError) {
            healthcheck.dependencies.keycloak = 'DOWN';
            healthcheck.status = 'DEGRADED';
        }

        const httpStatus = healthcheck.status === 'UP' ? 200 : 503;
        res.status(httpStatus).json(healthcheck);
    } catch (error) {
        healthcheck.status = 'DOWN';
        res.status(500).json(healthcheck);
    }
});

const articlesCountGauge = new client.Gauge({
    name: 'collector_total_articles',
    help: 'Nombre total d\'articles en vente dans la boutique'
});

const updateMetrics = async () => {
    try {
        const result = await db.query('SELECT COUNT(*) FROM articles');
        articlesCountGauge.set(parseInt(result.rows[0].count));
    } catch (err) {
        console.error("Erreur mise à jour métriques:", err.message);
    }
};

if (require.main === module) {
    setInterval(updateMetrics, 5000);
    app.listen(port, () => {
        console.log(`Serveur sécurisé sur http://localhost:${port}`);
        console.log(`=== NOUVELLE VERSION V2 CHARGÉE AVEC SUCCÈS ===`);
    });
}

module.exports = app;