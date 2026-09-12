const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  signup: (body) => request("/members/signup", { method: "POST", body: JSON.stringify(body) }),
  login: (body) => request("/members/login", { method: "POST", body: JSON.stringify(body) }),
  me: () => request("/members/me"),
  downline: () => request("/members/downline"),
  commissions: () => request("/members/commissions"),
  initializePayment: (amount) =>
    request("/payments/initialize", { method: "POST", body: JSON.stringify({ amount }) }),
  withdraw: (amount) =>
    request("/payments/withdraw", { method: "POST", body: JSON.stringify({ amount }) }),
};
