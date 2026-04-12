const request = require('supertest');
jest.mock('../src/db', () => ({
    query: jest.fn(),
    ready: Promise.resolve(),
    end: jest.fn()
}));

jest.mock('keycloak-connect', () => {
    return jest.fn().mockImplementation(() => {
        return {
            middleware: () => (req, res, next) => next(),
            protect: () => (req, res, next) => {
                // On simule un utilisateur connecté avec un faux ID
                req.kauth = {
                    grant: {
                        access_token: {
                            content: { sub: 'user-bruce-wayne-123' }
                        }
                    }
                };
                next();
            }
        };
    });
});

const app = require('../src/server');
const db = require('../src/db');

describe('API Collector - Batterie de Tests Complète', () => {

    beforeEach(() => {
        jest.clearAllMocks(); // On nettoie nos cascadeurs entre chaque test
    });

    describe('Routes Publiques', () => {
        it('Doit répondre UP sur /health (Happy Path)', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app).get('/health');
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('UP');
        });

        it('Doit répondre DEGRADED (503) si la DB plante (Sad Path)', async () => {
            db.query.mockRejectedValueOnce(new Error('Connexion DB perdue'));
            const res = await request(app).get('/health');
            expect(res.statusCode).toEqual(503);
            expect(res.body.status).toBe('DEGRADED');
            expect(res.body.dependencies.database).toBe('DOWN');
        });

        it('Doit lister les articles avec succès', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 1, title: 'Figurine Batman' }] });
            const res = await request(app).get('/api/articles');
            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveLength(1);
        });

        it('Doit gérer une erreur 500 si la requête liste articles échoue', async () => {
            db.query.mockRejectedValueOnce(new Error('Erreur fatale'));
            const res = await request(app).get('/api/articles');
            expect(res.statusCode).toEqual(500);
            expect(res.body.error).toBeDefined();
        });
    });

    // ==========================================
    // TESTS DES ROUTES PROTÉGÉES (CRUD)
    // ==========================================
    describe('Routes Protégées (Simulées avec Keycloak Mocké)', () => {

        it('Doit permettre à un utilisateur de créer un article (POST)', async () => {
            // On prépare la réponse simulée de la DB après un INSERT
            db.query.mockResolvedValueOnce({
                rows: [{ id: 42, title: 'Batarang', price: 100, seller_id: 'user-bruce-wayne-123' }]
            });

            const res = await request(app)
                .post('/api/articles')
                .send({
                    title: 'Batarang',
                    description: 'Très pointu',
                    price: 100,
                    image_url: 'http://image.com'
                });

            expect(res.statusCode).toEqual(201); // 201 Created
            expect(res.body.title).toBe('Batarang');
            // On vérifie que la DB a bien reçu un INSERT
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO articles'),
                expect.any(Array)
            );
        });

        it('Doit renvoyer une erreur 404 si on supprime un article inexistant (DELETE)', async () => {
            // Le mock renvoie un tableau vide (l'article n'a pas été trouvé ou n'appartient pas au user)
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app).delete('/api/articles/999');

            expect(res.statusCode).toEqual(404);
            expect(res.body.error).toContain('non trouvé');
        });

        it('Doit permettre de modifier son propre article (PUT)', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ id: 1, title: 'Batarang Modifié' }]
            });

            const res = await request(app)
                .put('/api/articles/1')
                .send({ title: 'Batarang Modifié', price: 150 });

            expect(res.statusCode).toEqual(200);
            expect(res.body.title).toBe('Batarang Modifié');
        });

        it('Doit lister uniquement mes propres articles (GET /my-articles)', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ id: 1, title: 'Mon Objet', seller_id: 'user-bruce-wayne-123' }]
            });

            const res = await request(app).get('/api/articles/my-articles');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveLength(1);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE seller_id = $1'),
                ['user-bruce-wayne-123']
            );
        });
    });
});