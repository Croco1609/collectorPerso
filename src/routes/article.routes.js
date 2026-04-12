const express = require('express');
const articleController = require('../controllers/article.controller');

// On exporte une fonction qui reçoit notre vigile Keycloak
module.exports = (keycloak) => {
    const router = express.Router();

    // 🟢 ROUTES PUBLIQUES (Accès libre)
    // L'URL de base sera déjà "/api/articles" grâce au server.js
    router.get('/', articleController.getAllArticles);

    // 🔒 ROUTES PROTÉGÉES (Keycloak bloque si on n'est pas connecté)
    // Attention à l'ordre : /my-articles doit être avant /:id pour ne pas confondre "my-articles" avec un ID
    router.get('/my-articles', keycloak.protect(), articleController.getMyArticles);

    router.post('/', keycloak.protect(), articleController.createArticle);
    router.put('/:id', keycloak.protect(), articleController.updateArticle);
    router.delete('/:id', keycloak.protect(), articleController.deleteArticle);

    return router;
};