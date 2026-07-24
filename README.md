# Fullstack Auth App

## Полноценное приложение с аутентификацией на React + Node.js + SQLite

## О проекте

Это Full-Stack приложение для управления пользователями с JWT-аутентификацией.  
Включает:

- Регистрация и вход с JWT-токенами
- CRUD операции над пользователями
- Поиск и сортировка на сервере
- Валидация на клиенте и сервере
- Красивые уведомления (react-hot-toast)
- Адаптивный дизайн с Tailwind CSS

---

## Демо

Приложение доступно по адресу:  
https://paveltomilov.ru/work/fullstack-app-react/

---

## 🛠️ Технологии

### Фронтенд

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React Hook Form
- React Hot Toast

### Бэкенд

- Node.js
- Express
- SQLite (better-sqlite3)
- JWT (jsonwebtoken)
- Bcryptjs
- Joi (валидация)

### Инфраструктура

- Nginx (прокси)
- GitLab CI/CD (автодеплой)
- Ubuntu 24.04

---

## Установка и запуск

### 1. Клонировать репозиторий

```bash
git clone https://github.com/paveltomilov/fullstack-app.git
cd fullstack-app
```

### 2. Установить зависимости

```bash
npm run install:all
```

### 3. Настроить переменные окружения

```bash
cp .env.example .env
```

### 4. Запустить бэкенд

```bash
cd backend
npm run dev
```

# Сервер будет доступен на http://localhost:5000

### 5. Запустить фронтенд

```bash
cd frontend
npm run dev
```

# Приложение будет доступно на http://localhost:5173
