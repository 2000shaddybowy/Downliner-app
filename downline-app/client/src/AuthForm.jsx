import { useState } from "react";
import { api } from "./api";

export default function AuthForm({ onAuthed }) {
  const [mode, setMode] = useState("login"); // 'login' | 'signup'
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", referralCode: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = mode === "signup" ? await api.signup(form) : await api.login(form);
      localStorage.setItem("token", result.token);
      onAuthed(result.member);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 340, margin: "60px auto", padding: "0 20px", fontFamily: "system-ui", color: "#f2f2f2" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 0.5, color: "#eafff2" }}>
          Area Code Pub & Bar
        </div>
        <div style={{ fontSize: 13, color: "#8fae9d", marginTop: 4 }}>
          Welcome — glad to have you here
        </div>
      </div>
      <h2 style={{ marginBottom: 16, color: "#f2f2f2" }}>{mode === "signup" ? "Create account" : "Log in"}</h2>

      {mode === "signup" && (
        <input placeholder="Full name" value={form.name} onChange={update("name")} required style={inputStyle} />
      )}
      <input placeholder="Email" type="email" value={form.email} onChange={update("email")} required style={inputStyle} />
      {mode === "signup" && (
        <input placeholder="Phone (optional)" value={form.phone} onChange={update("phone")} style={inputStyle} />
      )}
      <input placeholder="Password" type="password" value={form.password} onChange={update("password")} required style={inputStyle} />
      {mode === "signup" && (
        <input
          placeholder="Referral code (optional)"
          value={form.referralCode}
          onChange={update("referralCode")}
          style={inputStyle}
        />
      )}

      {error && <div style={{ color: "#e5484d", marginBottom: 10, fontSize: 13 }}>{error}</div>}

      <button type="submit" disabled={loading} style={buttonStyle}>
        {loading ? "Please wait…" : mode === "signup" ? "Sign up" : "Log in"}
      </button>

      <div style={{ marginTop: 14, fontSize: 13, textAlign: "center", color: "#aaa" }}>
        {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          style={{ background: "none", border: "none", color: "#2d6a4f", cursor: "pointer", fontWeight: 600 }}
        >
          {mode === "signup" ? "Log in" : "Sign up"}
        </button>
      </div>
    </form>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  marginBottom: 10,
  borderRadius: 8,
  border: "1px solid #333",
  background: "#161616",
  color: "#f2f2f2",
};

const buttonStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "none",
  background: "#2d6a4f",
  color: "#eafff2",
  fontWeight: 600,
  cursor: "pointer",
};
