const request = require('supertest');
const app = require('../src/server');
jest.mock('../src/db', () => {
    return {
        query: jest.fn(),
        ready: Promise.resolve(),
        end: jest.fn()
    };
});

const db = require('../src/db');

describe('Vérification des routes publiques', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('doit répondre UP sur la route de santé avec les dépendances', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        const res = await request(app).get('/health');

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('UP');
        expect(res.body.dependencies).toBeDefined();
    });

    it('doit permettre de voir le catalogue sans être connecté', async () => {
        const fauxArticles = [
            { id: 1, title: 'Article de test Mocké', price: 10 }
        ];

        db.query.mockResolvedValueOnce({ rows: fauxArticles });

        const res = await request(app).get('/api/articles');

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBeTruthy();
        expect(res.body[0].title).toBe('Article de test Mocké');
    });
});