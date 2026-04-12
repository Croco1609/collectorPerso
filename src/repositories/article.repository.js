const db = require('../db');

class ArticleRepository {
    // Récupérer tous les articles
    async findAll() {
        const result = await db.query('SELECT * FROM articles ORDER BY created_at DESC');
        return result.rows;
    }

    // Créer un article
    async create(title, description, price, image_url, seller_id) {
        const result = await db.query(
            'INSERT INTO articles (title, description, price, image_url, seller_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [title, description, price, image_url, seller_id]
        );
        return result.rows[0];
    }

    // Supprimer un article
    async delete(id, seller_id) {
        const result = await db.query(
            'DELETE FROM articles WHERE id = $1 AND seller_id = $2 RETURNING *',
            [id, seller_id]
        );
        return result.rows[0]; // Retourne l'article supprimé (ou undefined si non trouvé)
    }

    // Mettre à jour un article
    async update(id, title, description, price, image_url, seller_id) {
        const result = await db.query(
            'UPDATE articles SET title = $1, description = $2, price = $3, image_url = $4 WHERE id = $5 AND seller_id = $6 RETURNING *',
            [title, description, price, image_url, id, seller_id]
        );
        return result.rows[0];
    }

    // Récupérer les articles d'un vendeur spécifique
    async findBySellerId(seller_id) {
        const result = await db.query(
            'SELECT * FROM articles WHERE seller_id = $1 ORDER BY created_at DESC',
            [seller_id]
        );
        return result.rows;
    }
}

module.exports = new ArticleRepository();