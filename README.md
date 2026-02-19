# 1. On initialise le projet Node.js (ça crée le fichier package.json)
npm init -y

# 2. On installe les paquets indispensables pour l'API et la base de données
npm install express pg cors dotenv

# 3. On installe nodemon pour le développement (il rechargera le code tout seul)
npm install --save-dev nodemon

# 4. On crée le dossier qui va contenir notre code source
mkdir src
