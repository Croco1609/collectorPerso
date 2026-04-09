# Étape 1: Base Node.js pour l'installation des dépendances
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Utilisation de npm ci pour une installation propre et sécurisée basée sur le .lock
RUN npm install

# Étape 2: Image finale plus légère
FROM node:18-alpine

# Mise à jour des paquets de l'OS (Corrige les failles Alpine)
RUN apk update && apk upgrade --no-cache

# CORRECTION : On installe la dernière version de npm v10 (compatible avec Node 18)
RUN npm install -g npm@10

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]