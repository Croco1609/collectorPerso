import {useState, useEffect, useRef} from 'react'
import axios from 'axios'
import Keycloak from 'keycloak-js'
import './App.css'

// Configuration Keycloak
const keycloakConfig = {
    url: 'http://localhost:8080',
    realm: 'collector-realm',
    clientId: 'collector-front'
};

function App() {
    const [articles, setArticles] = useState([])
    const [loading, setLoading] = useState(true)
    const [formData, setFormData] = useState({ title: '', description: '', price: '', image_url: '' })

    // États pour Keycloak
    const [keycloak, setKeycloak] = useState(null)
    const [authenticated, setAuthenticated] = useState(false)

    const isRun = useRef(false);

    // 1. Initialisation de Keycloak au démarrage
    useEffect(() => {
        if (isRun.current) return;
        isRun.current = true;

        const kc = new Keycloak(keycloakConfig);
        kc.init({ onLoad: 'check-sso', checkLoginIframe: false }).then(auth => {
            setKeycloak(kc);
            setAuthenticated(auth);
        });
    }, []);

    const fetchArticles = () => {
        axios.get('http://localhost:3000/api/articles')
            .then(res => {
                setArticles(res.data)
                setLoading(false)
            })
    }

    useEffect(() => { fetchArticles() }, [])

    // 2. Fonction pour envoyer le formulaire (avec le Token !)
    const handleSubmit = (e) => {
        e.preventDefault()

        // On ajoute le Token Keycloak dans les headers pour que le Backend sache qui écrit
        const config = {
            headers: { Authorization: `Bearer ${keycloak.token}` }
        };

        axios.post('http://localhost:3000/api/articles', formData, config)
            .then(() => {
                setFormData({ title: '', description: '', price: '', image_url: '' })
                fetchArticles()
            })
            .catch(err => console.error("Erreur lors de l'ajout", err))
    }

    // 3. Fonction pour supprimer un article
    const handleDelete = (id) => {
        if (!window.confirm("Voulez-vous vraiment supprimer cet article ?")) return;

        const config = {
            headers: { Authorization: `Bearer ${keycloak.token}` }
        };

        axios.delete(`http://localhost:3000/api/articles/${id}`, config)
            .then(() => {
                fetchArticles(); // On rafraîchit la liste après suppression
            })
            .catch(err => {
                console.error("Erreur lors de la suppression", err);
                alert("Impossible de supprimer cet article (vous n'êtes peut-être pas le vendeur).");
            });
    }

    return (
        <div className="container">
            <header>
                <h1>🏆 Collector.shop</h1>

                {/* 3. Boutons Connexion / Déconnexion */}
                <div>
                    {/* On vérifie d'abord si l'objet keycloak n'est pas null */}
                    {keycloak && (
                        authenticated ? (
                            <button onClick={() => keycloak.logout()} style={{ backgroundColor: '#ff4444' }}>
                                Déconnexion ({keycloak.tokenParsed?.preferred_username})
                            </button>
                        ) : (
                            <button onClick={() => keycloak.login()} style={{ backgroundColor: '#44bb44' }}>
                                Se connecter
                            </button>
                        )
                    )}

                    {/* Optionnel : un petit message si Keycloak n'est pas encore prêt */}
                    {!keycloak && <span>Chargement de la sécurité...</span>}
                </div>
            </header>

            {/* 4. On n'affiche le formulaire QUE si l'utilisateur est connecté */}
            {authenticated ? (
                <div className="form-card">
                    <h3>Mettre un objet en vente</h3>
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text" placeholder="Titre" required
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                        <textarea
                            placeholder="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                        <input
                            type="text" placeholder="URL de l'image (ex: https://...)"
                            value={formData.image_url}
                            onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                        />
                        <input
                            type="number" placeholder="Prix (€)" required
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: e.target.value})}
                        />
                        <button type="submit">Ajouter au catalogue</button>
                    </form>
                </div>
            ) : (
                <div className="info-message">
                    <p>💡 Connectez-vous pour mettre un objet en vente !</p>
                </div>
            )}

            <hr />

            <div className="articles-grid">
                {loading ? <p>Chargement...</p> : articles.map(art => (
                    <div key={art.id} className="article-card">
                        <div className="image-container">
                            <img 
                                src={art.image_url || 'https://via.placeholder.com/300x200?text=Pas+d%27image'} 
                                alt={art.title} 
                                className="article-image"
                            />
                            {/* Bouton de suppression visible uniquement pour le propriétaire */}
                            {authenticated && keycloak?.tokenParsed?.sub === art.seller_id && (
                                <button 
                                    onClick={() => handleDelete(art.id)}
                                    className="delete-btn-icon"
                                    title="Supprimer"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                        <div className="article-content">
                            <h3>{art.title}</h3>
                            <p>{art.description}</p>
                            <div className="article-price">{art.price} €</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default App