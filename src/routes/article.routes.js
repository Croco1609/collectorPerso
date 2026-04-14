const express = require('express');
const articleController = require('../controllers/article.controller');

module.exports = (keycloak) => {
    const router = express.Router();

    router.get('/', articleController.getAllArticles);

    router.get('/my-articles', keycloak.protect(), articleController.getMyArticles);

    router.post('/', keycloak.protect(), articleController.createArticle);
    router.put('/:id', keycloak.protect(), articleController.updateArticle);
    router.delete('/:id', keycloak.protect(), articleController.deleteArticle);

    return router;
};