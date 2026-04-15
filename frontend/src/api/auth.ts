export interface AuthUser {
  id: number;
  email: string;
  nickname: string | null;
  country_code: string | null;
  workplace: string | null;
  avatar_variant: number;
  avatar_image_data: string | null;
}

interface AuthResponse {
  user: AuthUser;
}

function parseUser(raw: Record<string, unknown>): AuthUser {
  return {
    id: Number(raw.id),
    email: String(raw.email ?? ""),
    nickname: raw.nickname != null ? String(raw.nickname) : null,
    country_code: raw.country_code != null && String(raw.country_code).trim() ? String(raw.country_code) : null,
    workplace: raw.workplace != null && String(raw.workplace).trim() ? String(raw.workplace) : null,
    avatar_variant: Math.max(0, Math.min(31, Math.round(Number(raw.avatar_variant ?? 0)))),
    avatar_image_data:
      raw.avatar_image_data != null && String(raw.avatar_image_data).trim() ? String(raw.avatar_image_data) : null,
  };
}

export async function register(email: string, password: string, nickname?: string): Promise<AuthUser> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password, nickname }),
  });
  if (!response.ok) {
    throw new Error("Registration failed");
  }
  const data = (await response.json()) as AuthResponse;
  return parseUser(data.user as unknown as Record<string, unknown>);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw new Error("Login failed");
  }
  const data = (await response.json()) as AuthResponse;
  return parseUser(data.user as unknown as Record<string, unknown>);
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function me(): Promise<AuthUser | null> {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error("Failed to load current user");
  }
  const data = (await response.json()) as AuthResponse;
  return parseUser(data.user as unknown as Record<string, unknown>);
}

export type ProfileUpdate = {
  nickname: string;
  country_code: string | null;
  workplace: string | null;
  avatar_variant: number;
  avatar_image_data: string | null;
};

export async function updateProfile(userId: number, body: ProfileUpdate): Promise<AuthUser> {
  const response = await fetch(`/api/users/${userId}/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error("Failed to update profile");
  }
  const data = (await response.json()) as AuthResponse;
  return parseUser(data.user as unknown as Record<string, unknown>);
}
