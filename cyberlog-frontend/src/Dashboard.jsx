import { useState, useEffect, useCallback } from "react";

const API_BASE = "http://localhost:5000/api";
const API_KEY = import.meta.env.VITE_API_KEY || "admin-dev-key-changeme";

const headers = { "Content-Type": "application/json", "X-API-Key": API_KEY };

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:        "#080f1e",
  surface:   "#0d1829",
  card:      "#111f35",
  border:    "#1e3050",
  borderHi:  "#2a4470",
  accent:    "#3b82f6",
  accentDim: "#1d4ed8",
  teal:      "#14b8a6",
  amber:     "#f59e0b",
  red:       "#ef4444",
  green:     "#22c55e",
  text:      "#e2e8f0",
  muted:     "#64748b",
  dim:       "#334155",
};

// ─── Severity / Status helpers ───────────────────────────────────────────────
const SEVERITY_COLOR = {
  low:      { bg: "#052e16", text: "#4ade80", border: "#166534" },
  medium:   { bg: "#451a03", text: "#fb923c", border: "#9a3412" },
  high:     { bg: "#450a0a", text: "#f87171", border: "#991b1b" },
  critical: { bg: "#2d0028", text: "#f0abfc", border: "#86198f" },
};

const STATUS_COLOR = {
  open:          { bg: "#0c1a2e", text: "#60a5fa", border: "#1e40af" },
  investigating: { bg: "#451a03", text: "#fb923c", border: "#9a3412" },
  resolved:      { bg: "#052e16", text: "#4ade80", border: "#166534" },
};

const badge = (map, key) => {
  const c = map[key] || { bg: C.dim, text: C.muted, border: C.border };
  return {
    display: "inline-flex", alignItems: "center",
    padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600,
    letterSpacing: "0.05em", textTransform: "uppercase",
    background: c.bg, color: c.text,
    border: `1px solid ${c.border}`,
  };
};

// ─── Mock data (mirrors real API shape) ─────────────────────────────────────
const MOCK_STATS = {
  total_logs: 4821, logs_today: 142,
  open_incidents: 7, critical_incidents: 2,
  anomalies_detected: 14, resolved_today: 5,
};

const MOCK_EVENTS_BY_TYPE = [
  { event_type: "login_failed",        count: 1832 },
  { event_type: "login_success",       count: 1540 },
  { event_type: "access_denied",       count: 892  },
  { event_type: "port_scan",           count: 310  },
  { event_type: "brute_force",         count: 198  },
  { event_type: "data_breach",         count: 49   },
];

const MOCK_LOGS_OVER_TIME = [
  { hour: "00:00", count: 18 }, { hour: "02:00", count: 12 },
  { hour: "04:00", count: 9  }, { hour: "06:00", count: 22 },
  { hour: "08:00", count: 67 }, { hour: "10:00", count: 95 },
  { hour: "12:00", count: 88 }, { hour: "14:00", count: 104 },
  { hour: "16:00", count: 91 }, { hour: "18:00", count: 73 },
  { hour: "20:00", count: 55 }, { hour: "22:00", count: 34 },
];

const MOCK_LIVE_LOGS = [
  { log_id: 1, event_type: "brute_force",    ip_address: "185.220.101.47", username: "admin",   severity: "high",   event_time: "2026-04-08T14:32:11" },
  { log_id: 2, event_type: "login_failed",   ip_address: "92.118.160.12",  username: "root",    severity: "medium", event_time: "2026-04-08T14:31:58" },
  { log_id: 3, event_type: "port_scan",      ip_address: "45.33.32.156",   username: null,      severity: "high",   event_time: "2026-04-08T14:31:44" },
  { log_id: 4, event_type: "login_success",  ip_address: "10.0.0.14",      username: "derkaoui",severity: "low",    event_time: "2026-04-08T14:31:30" },
  { log_id: 5, event_type: "access_denied",  ip_address: "203.0.113.42",   username: "jdoe",    severity: "medium", event_time: "2026-04-08T14:31:15" },
  { log_id: 6, event_type: "data_breach",    ip_address: "198.51.100.7",   username: "svc_acct",severity: "critical",event_time:"2026-04-08T14:30:59"},
  { log_id: 7, event_type: "login_failed",   ip_address: "77.88.55.60",    username: "guest",   severity: "low",    event_time: "2026-04-08T14:30:44" },
  { log_id: 8, event_type: "port_scan",      ip_address: "104.21.14.101",  username: null,      severity: "high",   event_time: "2026-04-08T14:30:31" },
];

const MOCK_INCIDENTS = [
  { incident_id: 1, title: "Brute Force on SSH Port", severity: "critical", status: "investigating", created_at: "2026-04-08T10:14:00" },
  { incident_id: 2, title: "Unusual Data Exfiltration", severity: "high",     status: "open",          created_at: "2026-04-08T09:02:00" },
  { incident_id: 3, title: "Multiple Failed Logins — Admin", severity: "high", status: "investigating", created_at: "2026-04-07T22:44:00" },
  { incident_id: 4, title: "Unauthorised Port Scan",   severity: "medium",   status: "open",          created_at: "2026-04-07T18:30:00" },
  { incident_id: 5, title: "Config File Access Attempt", severity: "medium", status: "resolved",      created_at: "2026-04-07T14:22:00" },
];

// ─── API helpers (fall back to mock if unreachable) ──────────────────────────
async function fetchOrMock(url, mock) {
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return mock;
    const json = await res.json();
    return json.data ?? json ?? mock;
  } catch {
    return mock;
  }
}

// ─── Tiny chart using SVG ────────────────────────────────────────────────────
function SparkLine({ data, color = C.accent, height = 56 }) {
  if (!data?.length) return null;
  const w = 320, h = height, pad = 4;
  const max = Math.max(...data.map(d => d.count));
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.count / max) * (h - pad * 2));
    return `${x},${y}`;
  });
  const fill = pts.map((p, i) => {
    const [x, y] = p.split(",");
    return i === 0 ? `M${x},${y}` : `L${x},${y}`;
  }).join(" ");
  const area = fill + ` L${320 - pad},${h - pad} L${pad},${h - pad} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace("#","")})`} />
      <path d={fill} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function DonutChart({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const colors = [C.accent, C.teal, C.amber, C.red, "#8b5cf6", "#ec4899"];
  const size = 120, cx = 60, cy = 60, r = 46, stroke = 14;
  const circ = 2 * Math.PI * r;

  let offset = 0;
  const slices = data.map((d, i) => {
    const pct = d.count / total;
    const dash = pct * circ;
    const slice = { offset, dash, color: colors[i % colors.length], ...d };
    offset += dash;
    return slice;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
      {slices.map((s, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
          stroke={s.color} strokeWidth={stroke}
          strokeDasharray={`${s.dash} ${circ - s.dash}`}
          strokeDashoffset={circ / 4 - s.offset}
          style={{ transition: "all 0.6s ease" }}
        />
      ))}
      <text x={cx} y={cy - 4} textAnchor="middle" fill={C.text} fontSize="18" fontWeight="600">{(total/1000).toFixed(1)}k</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill={C.muted} fontSize="10">total</text>
    </svg>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = C.accent, trend }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "18px 20px",
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 700, color: C.text, lineHeight: 1 }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, marginTop: 6, color: trend === "up" ? C.red : trend === "down" ? C.green : C.muted }}>
          {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}{sub}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: "0.04em", textTransform: "uppercase" }}>{title}</h2>
      {action && <button onClick={action.fn} style={{ fontSize: 12, background: "none", border: `1px solid ${C.border}`, color: C.muted, padding: "4px 10px", borderRadius: 6, cursor: "pointer" }}>{action.label}</button>}
    </div>
  );
}

function LiveLogRow({ log, isNew }) {
  const rel = (ts) => {
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    return `${Math.floor(diff/3600)}h ago`;
  };

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "120px 1fr 130px 80px 70px",
      gap: 12, alignItems: "center",
      padding: "10px 16px",
      borderBottom: `1px solid ${C.border}`,
      background: isNew ? "rgba(59,130,246,0.05)" : "transparent",
      transition: "background 1s ease",
      fontSize: 13,
    }}>
      <span style={{ color: C.muted, fontFamily: "monospace", fontSize: 12 }}>{rel(log.event_time)}</span>
      <span style={{ ...badge(SEVERITY_COLOR, log.severity) }}>{log.event_type.replace("_", " ")}</span>
      <span style={{ color: C.text, fontFamily: "monospace", fontSize: 12 }}>{log.ip_address}</span>
      <span style={{ color: C.muted }}>{log.username || "—"}</span>
      <span style={badge(SEVERITY_COLOR, log.severity)}>{log.severity}</span>
    </div>
  );
}

function IncidentRow({ inc }) {
  const dt = new Date(inc.created_at);
  const fmt = `${dt.getMonth()+1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2,"0")}`;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "11px 16px", borderBottom: `1px solid ${C.border}`,
      fontSize: 13,
    }}>
      <span style={{ color: C.muted, fontSize: 11, minWidth: 80, fontFamily: "monospace" }}>{fmt}</span>
      <span style={{ flex: 1, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inc.title}</span>
      <span style={badge(SEVERITY_COLOR, inc.severity)}>{inc.severity}</span>
      <span style={badge(STATUS_COLOR, inc.status)}>{inc.status}</span>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats,    setStats]    = useState(MOCK_STATS);
  const [logs,     setLogs]     = useState(MOCK_LIVE_LOGS);
  const [incidents,setIncidents]= useState(MOCK_INCIDENTS);
  const [evtTypes, setEvtTypes] = useState(MOCK_EVENTS_BY_TYPE);
  const [newLogId, setNewLogId] = useState(null);
  const [health,   setHealth]   = useState(null); // null | "ok" | "error"
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const refresh = useCallback(async () => {
    const [logsData, incData] = await Promise.all([
      fetchOrMock(`${API_BASE}/logs`, MOCK_LIVE_LOGS),
      fetchOrMock(`${API_BASE}/incidents`, MOCK_INCIDENTS),
    ]);
    if (logsData?.length) {
      const incoming = Array.isArray(logsData) ? logsData.slice(0, 8) : MOCK_LIVE_LOGS;
      if (incoming[0]?.log_id !== logs[0]?.log_id) {
        setNewLogId(incoming[0]?.log_id);
        setTimeout(() => setNewLogId(null), 2000);
      }
      setLogs(incoming);
    }
    if (incData?.length) setIncidents(Array.isArray(incData) ? incData.slice(0, 5) : MOCK_INCIDENTS);
    setLastRefresh(new Date());
  }, [logs]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/health`, { headers });
        setHealth(r.ok ? "ok" : "error");
      } catch { setHealth("error"); }
    })();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const totalEvents = evtTypes.reduce((s, e) => s + e.count, 0);

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, color: C.text,
      fontFamily: "'IBM Plex Mono', 'JetBrains Mono', 'Courier New', monospace",
      padding: "0 0 60px",
    }}>

      {/* ── Topbar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 28px",
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${C.accent}`,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: "0.05em" }}>CYBERLOG</div>
            <div style={{ fontSize: 10, color: C.muted }}>Security Operations Dashboard</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ fontSize: 11, color: C.muted }}>
            Last refresh: <span style={{ color: C.text }}>{lastRefresh.toLocaleTimeString()}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: health === "ok" ? C.green : health === "error" ? C.red : C.amber,
              boxShadow: `0 0 6px ${health === "ok" ? C.green : health === "error" ? C.red : C.amber}`,
            }} />
            <span style={{ fontSize: 11, color: C.muted }}>
              {health === "ok" ? "API connected" : health === "error" ? "API offline (mock data)" : "connecting..."}
            </span>
          </div>
          <button
            onClick={refresh}
            style={{
              background: "none", border: `1px solid ${C.border}`,
              color: C.muted, padding: "5px 12px", borderRadius: 6,
              cursor: "pointer", fontSize: 12,
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 28px 0" }}>

        {/* ── Stat cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard label="Total Logs"         value={stats.total_logs.toLocaleString()} sub="all time"        color={C.accent} />
          <StatCard label="Logs Today"         value={stats.logs_today}                  sub="+12 last hour"   color={C.teal}   trend="up" />
          <StatCard label="Open Incidents"     value={stats.open_incidents}              sub={`${stats.critical_incidents} critical`} color={C.red} trend="up" />
          <StatCard label="Anomalies Detected" value={stats.anomalies_detected}          sub="last 24h"        color={C.amber}  trend="up" />
          <StatCard label="Resolved Today"     value={stats.resolved_today}              sub="incidents closed" color={C.green}  trend="down" />
        </div>

        {/* ── Middle row: sparkline + donut ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, marginBottom: 24 }}>

          {/* Activity over time */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px 20px 14px" }}>
            <SectionHeader title="Log activity — last 24 hours" />
            <div style={{ marginTop: 4 }}>
              <SparkLine data={MOCK_LOGS_OVER_TIME} color={C.accent} height={80} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              {MOCK_LOGS_OVER_TIME.filter((_, i) => i % 3 === 0).map(d => (
                <span key={d.hour} style={{ fontSize: 10, color: C.muted }}>{d.hour}</span>
              ))}
            </div>
          </div>

          {/* Events by type */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "20px" }}>
            <SectionHeader title="Events by type" />
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <DonutChart data={evtTypes} />
              <div style={{ flex: 1 }}>
                {evtTypes.map((e, i) => {
                  const colors = [C.accent, C.teal, C.amber, C.red, "#8b5cf6", "#ec4899"];
                  const pct = Math.round((e.count / totalEvents) * 100);
                  return (
                    <div key={e.event_type} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i], flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: C.muted, flex: 1 }}>{e.event_type.replace("_", " ")}</span>
                      <span style={{ fontSize: 11, color: C.text, fontWeight: 600 }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Bottom row: live logs + incidents ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16 }}>

          {/* Live log feed */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "16px 16px 12px" }}>
              <SectionHeader title="Live log feed" action={{ label: "View all →", fn: () => {} }} />
            </div>

            {/* Table header */}
            <div style={{
              display: "grid", gridTemplateColumns: "120px 1fr 130px 80px 70px",
              gap: 12, padding: "8px 16px",
              background: C.surface, borderBottom: `1px solid ${C.border}`,
              fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em",
            }}>
              <span>Time</span><span>Event</span><span>IP Address</span><span>User</span><span>Severity</span>
            </div>

            {logs.map(log => (
              <LiveLogRow key={log.log_id} log={log} isNew={log.log_id === newLogId} />
            ))}
          </div>

          {/* Incidents */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
            <div style={{ padding: "16px 16px 12px" }}>
              <SectionHeader title="Active incidents" action={{ label: "Manage →", fn: () => {} }} />
            </div>

            <div style={{
              display: "flex", gap: 8, padding: "0 16px 12px",
            }}>
              {[
                { label: "Open",          count: incidents.filter(i => i.status === "open").length,          color: C.accent },
                { label: "Investigating", count: incidents.filter(i => i.status === "investigating").length, color: C.amber  },
                { label: "Resolved",      count: incidents.filter(i => i.status === "resolved").length,      color: C.green  },
              ].map(s => (
                <div key={s.label} style={{
                  flex: 1, background: C.surface, borderRadius: 6, padding: "8px 10px",
                  border: `1px solid ${C.border}`, textAlign: "center",
                }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.count}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {incidents.map(inc => (
              <IncidentRow key={inc.incident_id} inc={inc} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
