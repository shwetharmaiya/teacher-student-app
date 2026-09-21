const configuredApiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
const API_URL = configuredApiUrl.endsWith("/api")
    ? configuredApiUrl
    : `${configuredApiUrl.replace(/\/$/, "")}/api`;

export async function apiFetch<T>(
    endpoint: string,
    options: RequestInit = {},
): Promise<T> {
    const token = localStorage.getItem("accessToken");
    const response = await fetch(
        `${API_URL}${endpoint}`,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...options.headers,
            },
        },
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || "Something went wrong",
        );
    }

    return data;
}
