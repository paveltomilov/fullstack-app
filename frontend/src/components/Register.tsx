import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { API_URL } from "../utils/api";

export const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!name || name.trim().length < 2) {
      toast.error("Имя должно содержать минимум 2 символа");
      setIsLoading(false);
      return;
    }

    // Проверка на пустые поля
    if (!name || !email || !password || !confirmPassword) {
      toast.error("Все поля обязательны для заполнения");
      setIsLoading(false);
      return;
    }

    // Проверка паролей
    if (password !== confirmPassword) {
      toast.error("Пароли не совпадают");
      setIsLoading(false);
      return;
    }

    // Проверка длины пароля
    if (password.length < 6) {
      toast.error("Пароль должен содержать минимум 6 символов");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Ошибка при регистрации");
      }

      login(data.token, data.user);
      toast.success("Регистрация прошла успешно!");

      // Очищаем форму
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");

      // Автоматически входим после регистрации
      // (можно оставить пользователя на странице логина)
    } catch (err: any) {
      toast.error(" " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto p-6 bg-white shadow-lg rounded-lg"
    >
      <input
        type="text"
        placeholder="Имя"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />

      <input
        type="password"
        placeholder="Пароль (минимум 6 символов)"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
        minLength={6}
      />

      <input
        type="password"
        placeholder="Подтвердите пароль"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />

      <button
        type="submit"
        disabled={isLoading}
        className="w-full p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {isLoading ? "Регистрация..." : "Зарегистрироваться"}
      </button>
    </form>
  );
};
