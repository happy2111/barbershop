# Stage 1: build
FROM node:20 AS builder
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

# Копируем весь проект
COPY . .

# Копируем .env, чтобы Prisma видела DATABASE_URL
COPY .env .env

# Генерируем Prisma Client
RUN npx prisma generate

# Сборка NestJS
RUN npm run build
