const articleRepo = require('../repositories/article.repository');

class ArticleController {

    // Correspond à : GET /api/articles
    async getAllArticles(req, res) {
        try {
            const articles = await articleRepo.findAll();
            res.status(200).json(articles);
        } catch (err) {
            console.error("Erreur Controller getAll:", err.message);
            res.status(500).json({ error: 'Erreur lors de la récupération des articles' });
        }
    }

    // Correspond à : POST /api/articles
    async createArticle(req, res) {
        try {
            const { title, description, price, image_url } = req.body;
            // On récupère l'ID du vendeur depuis le token Keycloak
            const seller_id = req.kauth?.grant?.access_token?.content?.sub;

            if (!seller_id) {
                return res.status(401).json({ error: "Utilisateur non identifié" });
            }

            // On délègue l'insertion au Repository
            const newArticle = await articleRepo.create(title, description, price, image_url, seller_id);
            res.status(201).json(newArticle);

        } catch (err) {
            console.error("Erreur Controller create:", err.message);
            res.status(500).json({ error: 'Erreur serveur lors de l\'enregistrement' });
        }
    }

    // Correspond à : DELETE /api/articles/:id
    async deleteArticle(req, res) {
        try {
            const { id } = req.params;
            const seller_id = req.kauth.grant.access_token.content.sub;

            const deletedArticle = await articleRepo.delete(id, seller_id);

            if (!deletedArticle) {
                return res.status(404).json({ error: 'Article non trouvé ou vous n\'êtes pas autorisé à le supprimer' });
            }

            res.status(200).json({ message: 'Article supprimé avec succès' });
        } catch (err) {
            console.error("Erreur Controller delete:", err.message);
            res.status(403).json({ error: 'Accès refusé ou erreur serveur' });
        }
    }

    async updateArticle(req, res) {
        try {
            const { id } = req.params;
            const { title, description, price, image_url } = req.body;
            const seller_id = req.kauth.grant.access_token.content.sub;

            const updatedArticle = await articleRepo.update(id, title, description, price, image_url, seller_id);

            if (!updatedArticle) {
                return res.status(404).json({ error: 'Article non trouvé ou vous n\'êtes pas autorisé à le modifier' });
            }

            res.status(200).json(updatedArticle);
        } catch (err) {
            console.error("Erreur Controller update:", err.message);
            res.status(403).json({ error: 'Accès refusé ou erreur serveur' });
        }
    }

    // Correspond à : GET /api/my-articles
    async getMyArticles(req, res) {
        try {
            const seller_id = req.kauth.grant.access_token.content.sub;
            const myArticles = await articleRepo.findBySellerId(seller_id);
            res.status(200).json(myArticles);
        } catch (err) {
            console.error("Erreur Controller getMyArticles:", err.message);
            res.status(500).json({ error: 'Erreur lors de la récupération de vos articles' });
        }
    }
}

// On exporte une instance de la classe
module.exports = new ArticleController();