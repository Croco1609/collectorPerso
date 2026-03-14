# Étape 1: Base Node.js pour l'installation des dépendances
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

# Étape 2: Image finale plus légère
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["npm", "run", "dev"]