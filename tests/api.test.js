const request = require('supertest');
const app = require('../src/server'); // Ton serveur
const db = require('../src/db');      // Ta connexion DB

describe('Vérification des routes publiques', () => {

    // On attend que la DB soit initialisée (tables créées) avant de lancer les tests
    beforeAll(async () => {
        await db.ready;
    });

    afterAll(async () => {
        await db.end();
    });

    it('doit répondre UP sur la route de santé avec les dépendances', async () => {
        const res = await request(app).get('/health');

        // On s'attend à un succès HTTP (200)
        expect(res.statusCode).toEqual(200);

        // On s'attend au nouveau standard 'UP'
        expect(res.body.status).toBe('UP');

        // On vérifie que notre tableau de bord est bien là
        expect(res.body.dependencies).toBeDefined();
        expect(res.body.dependencies.database).toBeDefined();
    });

    it('doit permettre de voir le catalogue sans être connecté', async () => {
        const res = await request(app).get('/api/articles');
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
    });
});