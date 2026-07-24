// Отправляем данные на сервер, где происходит фильтрация и сортировка
import { User, EditUser, NewUser } from "./types";
import { useEffect, useState, useRef, useTransition, useCallback } from "react";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import { Login } from "./components/Login";
import { Register } from "./components/Register";
import { fetchWithAuth } from "./utils/api";

function formatDate(dateString: string | number | Date) {
  const data = new Date(dateString);
  return data.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function App() {
  const { isAuthenticated, logout, user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<NewUser>({
    name: "",
    email: "",
    age: "",
    city: "",
  });
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditUser>({
    name: "",
    email: "",
    age: "",
    city: "",
  });

  // Состояния для поиска и сортировки
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "age" | "city">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isPending, startTransition] = useTransition();
  const [isLogin, setIsLogin] = useState(false);

  const handleSort = (newSortBy: "name" | "age" | "city") => {
    startTransition(() => {
      setSortBy(newSortBy);
      setSortOrder("asc");
    });
  };

  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      if (users.length === 0) {
        setLoading(true);
      }
      setError(null);

      // Формируем URL с параметрами
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (sortBy) params.append("sort", sortBy);
      if (sortOrder) params.append("order", sortOrder);

      const response = await fetchWithAuth(`/users?${params.toString()}`);
      if (response.status === 401) {
        logout();
        return;
      }

      if (!response.ok) {
        throw new Error("Ошибка загрузки данных");
      }
      const data = await response.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, sortBy, sortOrder]);

  // ЗАГРУЗКА ДАННЫХ С СЕРВЕРА (с параметрами)
  useEffect(() => {
    if (isAuthenticated) {
      startTransition(() => {
        fetchUsers();
      });
    }
  }, [isAuthenticated, fetchUsers]);

  useEffect(() => {
    // После загрузки данных устанавливаем фокус обратно на поле ввода
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [users]); // ← срабатывает, когда данные обновились

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();

    //  1. Проверка имени
    if (!newUser.name || newUser.name.trim().length < 2) {
      toast.error("Имя должно содержать минимум 2 символа");
      return;
    }

    // 2. Проверка email
    if (!newUser.email || !newUser.email.includes("@")) {
      toast.error("Введите корректный email");
      return;
    }

    // 3. Проверка возраста (ОБЯЗАТЕЛЬНО)
    if (!newUser.age || newUser.age.trim() === "") {
      toast.error("Возраст обязателен для заполнения");
      return;
    }

    const ageNum = parseInt(newUser.age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      toast.error("Возраст должен быть от 1 до 120 лет");
      return;
    }

    // 4. Проверка города
    if (!newUser.city || newUser.city.trim().length < 1) {
      toast.error("Город обязателен для заполнения");
      return;
    }

    // 5. Проверка длины города
    if (newUser.city && newUser.city.length > 100) {
      toast.error("Название города не должно превышать 100 символов");
      return;
    }

    try {
      const response = await fetchWithAuth("/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newUser.name.trim(),
          email: newUser.email.trim(),
          age: ageNum,
          city: newUser.city.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // ПОКАЗЫВАЕМ КОНКРЕТНУЮ ОШИБКУ с сервера
        throw new Error(data.error || "Ошибка при добавлении пользователя");
      }

      // Очищаем форму
      setNewUser({ name: "", email: "", age: "", city: "" });

      // Обновляем список (перезагружаем данные с сервера)
      await fetchUsers();

      toast("Пользователь добавлен");
    } catch (err: any) {
      toast("Ошибка:" + err.message);
    }
  }

  async function handleDeleteUser(id: number): Promise<void> {
    // Спрашиваем подтверждение
    if (!confirm(`Вы уверены что хотите удалить пользователя с ID ${id}`)) {
      return;
    }

    try {
      const response = await fetchWithAuth(`/users/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Ошибка при удалении пользователя");
      }

      // Обновляем список после удаления
      await fetchUsers();
      toast("Пользователь удален");
    } catch (err: any) {
      toast("Ошибка: " + err.message);
    }
  }

  function handleEditClick(user: User): void {
    // Заполняем форму данными пользователя
    setEditForm({
      name: user.name,
      email: user.email,
      age: user.age ? String(user.age) : "",
      city: user.city || "",
    });

    setEditingUserId(user.id);
  }

  async function handleUpdateUser(e: React.FormEvent) {
    e.preventDefault();

    // Те же проверки
    if (!editForm.name || editForm.name.trim().length < 2) {
      toast.error("Имя должно содержать минимум 2 символа");
      return;
    }

    if (!editForm.email || !editForm.email.includes("@")) {
      toast.error("Введите корректный email");
      return;
    }

    // Проверка возраста (ОБЯЗАТЕЛЬНО)
    if (!editForm.age || editForm.age.trim() === "") {
      toast.error("Возраст обязателен для заполнения");
      return;
    }

    const ageNum = parseInt(editForm.age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      toast.error("Возраст должен быть от 1 до 120 лет");
      return;
    }

    // Проверка города (ОБЯЗАТЕЛЬНО)
    if (!editForm.city || editForm.city.trim().length < 1) {
      toast.error("Город обязателен для заполнения");
      return;
    }

    try {
      const response = await fetchWithAuth(`/users/${editingUserId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          age: parseInt(editForm.age) || 0,
          city: editForm.city || "Не указан",
        }),
      });

      // ЧИТАЕМ ОТВЕТ от сервера
      const data = await response.json();

      if (!response.ok) {
        // ПОКАЗЫВАЕМ КОНКРЕТНУЮ ОШИБКУ с сервера
        throw new Error(data.error || "Ошибка при обновлении пользователя");
      }

      // Закрываем форму редактирования
      setEditingUserId(null);
      setEditForm({ name: "", email: "", age: "", city: "" });

      // Обновляем список
      await fetchUsers();
      toast("Пользователь обновлен!");
    } catch (err: any) {
      toast("Ошибка: " + err.message);
    }
  }

  //  Проверка авторизации
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
              {isLogin ? "Вход" : "Регистрация"}
            </h1>

            {isLogin ? <Login /> : <Register />}

            <div className="mt-4 text-center border-t border-gray-200 pt-4">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors text-sm font-medium"
              >
                {isLogin
                  ? "Нет аккаунта? Зарегистрироваться"
                  : "Уже есть аккаунт? Войти"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg max-w-md">
          <p className="text-red-700">Ошибка: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* ШАПКА */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">
            Привет, {user?.name}!
          </h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Выйти
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* ЗАГОЛОВОК */}
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Список пользователей
        </h2>

        {/* ФОРМА ДОБАВЛЕНИЯ */}
        <form
          onSubmit={handleAddUser}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6"
        >
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Имя"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="flex-1 min-w-[140px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) =>
                setNewUser({ ...newUser, email: e.target.value })
              }
              className="flex-1 min-w-[180px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="Возраст"
              value={newUser.age}
              onChange={(e) => setNewUser({ ...newUser, age: e.target.value })}
              className="w-28 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Город"
              value={newUser.city}
              onChange={(e) => setNewUser({ ...newUser, city: e.target.value })}
              className="flex-1 min-w-[120px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Добавить
            </button>
          </div>
        </form>

        {/* ПОИСК И СОРТИРОВКА */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              placeholder="Поиск по имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <span className="text-sm font-medium text-gray-600">
              Сортировать:
            </span>
            <button
              onClick={() => handleSort("name")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === "name"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              По имени
            </button>
            <button
              onClick={() => handleSort("age")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === "age"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              По возрасту
            </button>
            <button
              onClick={() => handleSort("city")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sortBy === "city"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              По городу
            </button>

            <button
              onClick={() => {
                setSearchQuery("");
                setSortBy("name");
                setSortOrder("asc");
              }}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Сбросить
            </button>
          </div>
        </div>

        {isPending && (
          <span className="text-sm text-gray-500 ml-2">Обновление...</span>
        )}

        {/* ФОРМА РЕДАКТИРОВАНИЯ */}
        {editingUserId !== null && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-yellow-800 mb-3">
              Редактирование пользователя (ID: {editingUserId})
            </h3>
            <form
              onSubmit={handleUpdateUser}
              className="flex flex-wrap gap-3"
            >
              <input
                type="text"
                placeholder="Имя"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                className="flex-1 min-w-[140px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <input
                type="email"
                placeholder="Email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                className="flex-1 min-w-[180px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <input
                type="number"
                placeholder="Возраст"
                value={editForm.age}
                onChange={(e) =>
                  setEditForm({ ...editForm, age: e.target.value })
                }
                className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <input
                type="text"
                placeholder="Город"
                value={editForm.city}
                onChange={(e) =>
                  setEditForm({ ...editForm, city: e.target.value })
                }
                className="flex-1 min-w-[120px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Сохранить
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingUserId(null);
                  setEditForm({ name: "", email: "", age: "", city: "" });
                }}
                className="px-5 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Отменить
              </button>
            </form>
          </div>
        )}

        {/* СПИСОК ПОЛЬЗОВАТЕЛЕЙ */}
        {users.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500">Пользователи не найдены</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="font-bold text-lg text-gray-800">
                  {user.name}
                </div>
                <div className="text-gray-600 text-sm">{user.email}</div>
                <div className="text-gray-500 text-sm mt-1">
                  {user.city || "Не указан"} · {user.age || "—"} лет · 📅{" "}
                  {formatDate(user.registered)}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                  >
                    Удалить
                  </button>
                  <button
                    onClick={() => handleEditClick(user)}
                    className="px-3 py-1.5 bg-yellow-400 text-gray-800 rounded-lg hover:bg-yellow-500 transition-colors text-sm"
                  >
                    Редактировать
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
