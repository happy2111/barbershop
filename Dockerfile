# Stage 1: build
FROM node:20 AS builder

WORKDIR /usr/src/app

# Копируем package.json и устанавливаем все зависимости (включая dev)
COPY package*.json ./
RUN npm install

# Копируем весь проект
COPY . .

# Генерируем Prisma Client
RUN npx prisma generate

# Сборка NestJS
RUN npm run build

# Stage 2: production
FROM node:20

WORKDIR /usr/src/app

# Копируем только production зависимости
COPY package*.json ./
RUN npm install --production

# Копируем скомпилированный код и Prisma Client
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# Копируем .env
COPY .env .env

CMD ["node", "dist/main"]
