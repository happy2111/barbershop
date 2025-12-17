# 1. Берём официальный Node.js
FROM node:20

# 2. Рабочая директория внутри контейнера
WORKDIR /usr/src/app

# 3. Копируем package.json и package-lock.json
COPY package*.json ./

# 4. Устанавливаем зависимости
RUN npm install

# 5. Копируем весь проект
COPY . .

# 6. Собираем NestJS
RUN npm run build

# 7. Экспонируем порт
EXPOSE 5000

# 8. Запуск приложения
CMD ["npm", "run", "start:prod"]
