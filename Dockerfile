# Stage 1: build
FROM node:20 AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Сборка NestJS (без prisma generate)
RUN npm run build

# Stage 2: production
FROM node:20
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY .env .env

# Генерируем Prisma Client при старте контейнера
CMD npx prisma generate && node dist/main
