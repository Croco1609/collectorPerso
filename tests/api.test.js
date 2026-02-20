const request = require('supertest');
const app = require('../src/server'); // Ton serveur
const db = require('../src/db');      // Ta connexion DB

describe('Vérification des routes publiques', () => {

    afterAll(async () => {
        await db.end();
    });

    it('doit répondre OK sur la route de santé', async () => {
        const res = await request(app).get('/health'); //
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('OK');
    });

    it('doit permettre de voir le catalogue sans être connecté', async () => {
        const res = await request(app).get('/api/articles'); //
        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
    });
});