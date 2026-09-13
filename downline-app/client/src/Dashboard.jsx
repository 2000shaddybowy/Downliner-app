import { useEffect, useState } from "react";
import { api } from "./api";
import DownlineTree from "./DownlineTree";

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.me().then(setMe).catch(() => {});
  }, []);

  const pay = async () => {
    setMessage("");
    try {
      const { authorization_url } = await api.initializePayment(Number(amount));
      window.location.href = authorization_url; // send them to Paystack checkout
    } catch (err) {
      setMessage(err.message);
    }
  };

  const withdraw = async () => {
    setMessage("");
    try {
      await api.withdraw(Number(amount));
      setMessage("Withdrawal requested.");
      const updated = await api.me();
      setMe(updated);
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (!me) return <div style={{ color: "#888", padding: 20 }}>Loading…</div>;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 20, fontFamily: "system-ui", color: "#f2f2f2" }}>
      <h2>Welcome, {me.name}</h2>
      <div style={{ display: "flex", gap: 20, margin: "16px 0" }}>
        <div style={cardStyle}>
          <div style={{ color: "#888", fontSize: 12 }}>Wallet balance</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>GHS {Number(me.wallet_balance).toFixed(2)}</div>
        </div>
        <div style={cardStyle}>
          <div style={{ color: "#888", fontSize: 12 }}>Your referral code</div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{me.referral_code}</div>
        </div>
      </div>

      <div style={{ margin: "20px 0", display: "flex", gap: 8 }}>
        <input
          type="number"
          placeholder="Amount (GHS)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #333", background: "#161616", color: "#fff" }}
        />
        <button onClick={pay} style={btn}>Make payment</button>
        <button onClick={withdraw} style={{ ...btn, background: "#333" }}>Withdraw</button>
      </div>
      {message && <div style={{ color: "#aaa", marginBottom: 12, fontSize: 13 }}>{message}</div>}

      <h3>Your downline</h3>
      <DownlineTree />
    </div>
  );
}

const cardStyle = { background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: 14, flex: 1 };
const btn = { padding: "10px 14px", borderRadius: 8, border: "none", background: "#2d6a4f", color: "#eafff2", fontWeight: 600, cursor: "pointer" };
