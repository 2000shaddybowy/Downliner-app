import { useEffect, useState } from "react";
import { ChevronRight, ChevronDown, Users, User } from "lucide-react";
import { api } from "./api";

function Node({ node, depth }) {
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children.length > 0;

  return (
    <div style={{ marginLeft: depth === 0 ? 0 : 20 }}>
      <div
        onClick={() => hasChildren && setOpen(!open)}
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
          borderRadius: 10, border: "1px solid #2a2a2a", background: "#161616",
          cursor: hasChildren ? "pointer" : "default", marginBottom: 6,
        }}
      >
        <span style={{ width: 16, color: "#888" }}>
          {hasChildren ? (open ? <ChevronDown size={16} /> : <ChevronRight size={16} />) : null}
        </span>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#2d6a4f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <User size={16} color="#eafff2" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#f2f2f2", fontSize: 14, fontWeight: 600 }}>{node.name}</div>
          <div style={{ color: "#888", fontSize: 12 }}>Joined {new Date(node.created_at).toLocaleDateString()}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "#aaa" }}>
          <div>GHS {Number(node.wallet_balance).toFixed(2)}</div>
        </div>
      </div>
      {open && hasChildren && (
        <div style={{ borderLeft: "1px solid #2a2a2a", paddingLeft: 4 }}>
          {node.children.map((c) => <Node key={c.id} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

export default function DownlineTree() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.downline().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <div style={{ color: "#e5484d" }}>{error}</div>;
  if (!data) return <div style={{ color: "#888" }}>Loading…</div>;

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, color: "#888", fontSize: 13 }}>
        <Users size={14} /> {data.totalMembers} people in your downline
      </div>
      {data.downline.length === 0 ? (
        <div style={{ color: "#888" }}>No recruits yet — share your referral code to start building your network.</div>
      ) : (
        data.downline.map((root) => <Node key={root.id} node={root} depth={0} />)
      )}
    </div>
  );
}
