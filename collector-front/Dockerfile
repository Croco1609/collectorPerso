# Étape 1: "Build Stage" - On construit l'application frontend
# On utilise une image Node.js complète pour avoir accès à npm
FROM node:18-alpine AS build-stage

WORKDIR /app

# On copie d'abord les fichiers de dépendances pour profiter du cache Docker
COPY package*.json ./

# On installe les dépendances
RUN npm install

# On copie le reste du code de l'application
COPY . .

# On lance la commande de build (généralement `npm run build` pour Vite, React, Vue...)
RUN npm run build

# Étape 2: "Production Stage" - On sert les fichiers avec Nginx
# On part d'une image Nginx très légère
FROM nginx:stable-alpine

# On copie les fichiers statiques générés à l'étape précédente dans le dossier par défaut de Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# On copie notre configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# On expose le port 80 (port par défaut de Nginx)
EXPOSE 80

# La commande pour démarrer Nginx
CMD ["nginx", "-g", "daemon off;"]