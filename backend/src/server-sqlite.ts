import express, { Request, Response } from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import path from "path";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Joi, { string } from "joi";

const app = express();
const PORT = 5000;
const JWT_SECRET = process.env.JWT_SECRET || "my-secret-key";

app.use(cors());
app.use(express.json());

// Подключаемся к базе данных
const dbPath = path.join(__dirname, "users.db");
const db = new sqlite3.Database(dbPath);

// Тип для пользователя
interface User {
  id: number;
  name: string;
  email: string;
  age: number | null;
  city: string | null;
  registered: string;
}

// Схема валидации для пользователя
const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.empty": "Имя обязательно для заполнения",
    "string.min": "Имя должно содержать минимум два символа",
    "string.max": "Имя не должно превышать 50 символов",
  }),
  email: Joi.string().email().required().messages({
    "string.empty": "Email обязателен для заполнения",
    "string.email": "Введите корректный Email",
  }),
  age: Joi.number().integer().min(1).max(120).allow(null, "").messages({
    "number.base": "Возраст должен быть числом",
    "number.min": "Возраст должен быть не менее 1 года",
    "number.max": "Возраст не может превышать 120 лет",
    "any.required": "Возраст обязателен для заполнения",
  }),
  city: Joi.string().min(1).required().messages({
    "string.empty": "Город обязателен для заполнения",
    "string.min": "Город не может быть пустым",
    "any.required": "Город обязателен для заполнения",
  }),
});

// Валидация для name
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    "string.empty": "Имя обязательно для заполнения",
    "string.min": "Имя должно содержать минимум 2 символа",
    "string.max": "Имя не должно превышать 50 символов",
  }),
  email: Joi.string().email().required().messages({
    "string.empty": "Email обязателен для заполнения",
    "string.email": "Введите корректный email",
  }),
  password: Joi.string().min(6).required().messages({
    "string.empty": "Пароль обязателен для заполнения",
    "string.min": "Пароль должен содержать минимум 6 символов",
  }),
});

// POST /register — регистрация
app.post("/register", async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Поля обязательны для заполнения" });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO auth_users (name, email, password_hash) VALUES (?, ?, ?)`;
    db.run(sql, [name, email, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ error: "Пользователь уже существует" });
        }
        return res.status(500).json({ error: "Ошибка при регистрации" });
      }

      const token = jwt.sign({ id: this.lastID, email, name }, JWT_SECRET, {
        expiresIn: "7d",
      });

      res.status(201).json({
        message: "Пользователь зарегистрирован",
        token: token,
        user: {
          id: this.lastID,
          name: name,
          email: email,
        },
      });
    });
  } catch (err) {
    res.status(500).json({ error: "Ошибка при регистрации" });
  }
});

// POST /login — вход
app.post("/login", (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email и пароль обязательны" });
  }

  const sql = `SELECT * FROM auth_users WHERE email = ?`;
  db.get(sql, [email], async (err, row: any) => {
    if (err) {
      return res.status(500).json({ error: "Ошибка при входе" });
    }
    if (!row) {
      return res.status(401).json({ error: "Неверный email или пароль" });
    }

    const token = jwt.sign(
      { id: row.id, email: row.email, name: row.name },
      JWT_SECRET,
      {
        expiresIn: "7d",
      },
    );
    res.json({ token, user: { id: row.id, email: row.email, name: row.name } });
  });
});

// Middleware для проверки JWT
function authMiddleware(req: Request, res: Response, next: any) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(401).json({ error: "Токен не передан" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Недействительный токен" });
  }
}

// GET /users — получить пользователей (с поиском и сортировкой)
app.get("/users", authMiddleware, (req: Request, res: Response) => {
  const searchQuery = req.query.search;
  const sortBy = req.query.sort || "name";
  const sortOrder = req.query.order || "asc";

  let sql = "SELECT * FROM users";
  const params = [];

  // Поиск
  if (searchQuery) {
    sql += " WHERE name LIKE ?";
    params.push(`%${searchQuery}%`);
  }

  // Сортировка
  const allowedSortFields = ["name", "age", "city", "id"];
  const sortField =
    typeof sortBy === "string" && allowedSortFields.includes(sortBy)
      ? sortBy
      : "name";
  const order =
    typeof sortOrder === "string" && sortOrder.toUpperCase() === "DESC"
      ? "DESC"
      : "ASC";
  sql += ` ORDER BY ${sortField} ${order}`;

  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error("Ошибка БД", err.message);
      res.status(500).json({ error: "Ошибка базы данных" });
    } else {
      res.json(rows);
    }
  });
});

// POST /users — добавить пользователя
app.post("/users", (req, res) => {
  //ВАЛИДАЦИЯ
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    // Собираем все ошибки в одно сообщение
    const errors = error.details.map((err) => err.message).join(", ");
    return res.status(400).json({ error: errors });
  }
  // Теперь используем проверенные данные
  const { name, email, age, city } = req.body;

  const sql = `
 INSERT INTO users (name, email, age, city, registered)
 VALUES (?, ?, ?, ?, date('now'))
  `;
  const params = [name, email, age, city];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("Ошибка при добавлении:", err.message);
      res.status(500).json({ error: "Ошибка при добавлении пользователя" });
    } else {
      res.status(201).json({
        id: this.lastID,
        name,
        email,
        age,
        city,
        registered: new Date().toISOString().split("T")[0],
      });
    }
  });
});

// GET /users/:id — получить одного пользователя
app.get("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);

  db.get("SELECT * FROM users WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error("Ошибка БД:", err.message);
      res.status(500).json({ error: "Ошибка базы данных" });
    } else if (!row) {
      res.status(404).json({ error: "Пользователь не найден" });
    } else {
      res.json(row);
    }
  });
});

// Тестовый маршрут
app.get("/", (req, res) => {
  res.send(`
      <h1>Сервер с SQLite работает!</h1>
    <p><a href="/users">/users</a> — все пользователи</p>
    <p><a href="/users?search=ле">/users?search=ле</a> — поиск</p>
    <p><a href="/users?sort=age&order=desc">/users?sort=age&order=desc</a> — сортировка</p>
    `);
});

//DELETE /users/:id — удалить пользователя
app.delete("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);

  // Проверяем, что id — число
  if (isNaN(id)) {
    return res.status(400).json({ error: "Некорректный ID" });
  }

  const sql = "DELETE FROM users WHERE id = ?";

  db.run(sql, [id], function (err) {
    if (err) {
      res.status(500).json({ error: "Ошибка при удалении пользователя" });
    } else if (this.changes === 0) {
      // Если ничего не удалилось — пользователь не найден
      res.status(404).json({ error: "Пользователь не найден" });
    } else {
      res.json({ message: "Пользователь удален", id });
    }
  });
});

//PUT /users/:id — обновить пользователя
app.put("/users/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { name, email, age, city } = req.body;

  // Проверяем, что id — число
  if (isNaN(id)) {
    return res.status(400).json({ error: "Некорректный ID" });
  }

  // ВАЛИДАЦИЯ
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });

  if (error) {
    const errors = error.details.map((err) => err.message).join(", ");
    return res.status(400).json({ error: errors });
  }

  const sql = `
    UPDATE users
    SET name = ?, email = ?, age = ?, city = ?
    WHERE id = ?
    `;
  const params = [name, email, age, city, id];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("Ошибка при обновлении:", err.message);
      res.status(500).json({ error: "Ошибка при обновлении пользователя" });
    } else if (this.changes === 0) {
      res.status(404).json({ error: "Пользователь не найден" });
    } else {
      res.json({ message: "Пользователь обновлён", id });
    }
  });
});

// Запуск
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Сервер с SQLite запущен: http://localhost:${PORT}`);
});

// Закрываем соединение при завершении
process.on("SIGINT", () => {
  db.close(() => {
    console.log("Соединение с БД закрыто");
    process.exit(0);
  });
});
