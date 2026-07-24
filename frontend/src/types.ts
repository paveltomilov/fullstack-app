// types.ts
export interface User {
  id: number;
  name: string;
  email: string;
  age: number | null;
  city: string | null;
  registered: string;
}

export interface NewUser {
  name: string;
  email: string;
  age: string;
  city: string;
}

export interface EditUser {
  name: string;
  email: string;
  age: string;
  city: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string; // ← добавили name
}
