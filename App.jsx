import { useState } from "react";
import AuthForm from "./AuthForm";
import Dashboard from "./Dashboard";

export default function App() {
  const [member, setMember] = useState(null);

  if (!member) {
    return (
      <div style={{ background: "#0d0d0d", minHeight: "100vh" }}>
        <AuthForm onAuthed={setMember} />
      </div>
    );
  }

  return (
    <div style={{ background: "#0d0d0d", minHeight: "100vh" }}>
      <Dashboard />
    </div>
  );
}
