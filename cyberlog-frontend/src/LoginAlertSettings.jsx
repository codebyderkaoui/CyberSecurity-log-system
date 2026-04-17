import { useState, useEffect, useCallback, useRef } from "react";

// ─── Theme ────────────────────────────────────────────────────────────────────
const C = {
  bg:"#080f1e", surface:"#0d1829", card:"#111f35", border:"#1e3050",
  borderHi:"#2a4470", accent:"#3b82f6", accentDim:"#1d4ed8",
  teal:"#14b8a6", amber:"#f59e0b", red:"#ef4444", green:"#22c55e",
  purple:"#8b5cf6", text:"#e2e8f0", muted:"#64748b", dim:"#1a2840",
};

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Input({ style, ...p }) {
  return (
    <input style={{
      background: C.surface, border: `1px solid ${C.border}`, color: C.text,
      borderRadius: 6, padding: "9px 12px", fontSize: 13, fontFamily: "inherit",
      outline: "none", width: "100%", ...style,
    }} {...p} />
  );
}

function Btn({ children, variant = "default", style, ...p }) {
  const base = {
    fontFamily: "inherit", fontSize: 13, padding: "9px 18px", borderRadius: 6,
    cursor: "pointer", border: `1px solid ${C.border}`, transition: "opacity .15s",
  };
  const v = {
    default: { background: C.surface, color: C.muted, ...base },
    primary: { background: C.accentDim, color: "#fff", border: `1px solid ${C.accent}`, ...base },
    danger:  { background: "#450a0a", color: "#f87171", border: "1px solid #991b1b", ...base },
    ghost:   { background: "none", color: C.muted, border: "none", ...base },
  };
  return <button style={{ ...v[variant], ...style }} {...p}>{children}</button>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LOGIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

// Hardcoded credentials that match your API keys.
// In production these would come from the backend.
const CREDENTIALS = {
  "admin":   { password: "admin123",   role: "admin",   apiKey: "admin-dev-key-changeme" },
  "analyst": { password: "analyst123", role: "analyst", apiKey: "analyst-dev-key-changeme" },
};

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    setError("");
    if (!username || !password) { setError("Username and password are required"); return; }
    setLoading(true);

    // Simulate network latency
    await new Promise(r => setTimeout(r, 600));

    const cred = CREDENTIALS[username.toLowerCase()];
    if (!cred || cred.password !== password) {
      setError("Invalid credentials. Try admin/admin123 or analyst/analyst123.");
      setLoading(false);
      return;
    }

    // Try to verify against real API
    try {
      const r = await fetch("http://localhost:5000/api/health", {
        headers: { "X-API-Key": cred.apiKey },
      });
      // API is live — use real key
    } catch {
      // API offline — continue with mock session
    }

    onLogin({ username: username.toLowerCase(), role: cred.role, apiKey: cred.apiKey });
    setLoading(false);
  };

  const handleKey = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div style={{
      minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "'IBM Plex Mono','Courier New',monospace",
    }}>
      {/* background grid */}
      <div style={{
        position: "fixed", inset: 0, opacity: 0.04,
        backgroundImage: "linear-gradient(#3b82f6 1px,transparent 1px),linear-gradient(90deg,#3b82f6 1px,transparent 1px)",
        backgroundSize: "40px 40px", pointerEvents: "none",
      }}/>

      <div style={{
        width: "min(420px, 92vw)", position: "relative",
      }}>
        {/* logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, background: C.accentDim,
            border: `1px solid ${C.accent}`, display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 14px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: ".07em", color: C.text }}>CYBERLOG</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Security Operations Center</div>
        </div>

        {/* card */}
        <div style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "28px 28px",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 20 }}>
            Sign in to continue
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Username</div>
            <Input
              placeholder="admin or analyst"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 5 }}>Password</div>
            <div style={{ position: "relative" }}>
              <Input
                type={showPass ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={handleKey}
                style={{ paddingRight: 40 }}
              />
              <button
                onClick={() => setShowPass(p => !p)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: C.muted, cursor: "pointer",
                  fontSize: 11, fontFamily: "inherit",
                }}
              >
                {showPass ? "hide" : "show"}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: "#450a0a", border: "1px solid #991b1b", borderRadius: 6,
              padding: "9px 12px", fontSize: 12, color: "#f87171", marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <Btn
            variant="primary"
            style={{ width: "100%", opacity: loading ? .7 : 1 }}
            onClick={handleLogin}
          >
            {loading ? "Authenticating..." : "Sign in →"}
          </Btn>

          {/* role hint */}
          <div style={{
            marginTop: 20, padding: "12px 14px", background: C.surface,
            borderRadius: 7, border: `1px solid ${C.border}`, fontSize: 11, color: C.muted,
          }}>
            <div style={{ marginBottom: 5, color: C.text, fontWeight: 600 }}>Demo credentials</div>
            <div>admin / admin123 — full access</div>
            <div style={{ marginTop: 3 }}>analyst / analyst123 — read only</div>
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 10, color: C.dim, marginTop: 16 }}>
          Protected by CyberLog Auth · Session expires on close
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. ALERT SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

const ALERT_COLORS = {
  critical: { bg: "#2d0028", border: "#86198f", text: "#f0abfc", icon: "🔴" },
  high:     { bg: "#450a0a", border: "#991b1b", text: "#f87171", icon: "🟠" },
  medium:   { bg: "#451a03", border: "#9a3412", text: "#fb923c", icon: "🟡" },
  info:     { bg: "#0c1a2e", border: "#1e40af", text: "#60a5fa", icon: "🔵" },
};

// Global alert queue — export so other pages can push alerts
let _pushAlert = null;
export function pushAlert(alert) {
  if (_pushAlert) _pushAlert(alert);
}

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);

  const push = useCallback((alert) => {
    const id = Date.now() + Math.random();
    setAlerts(p => [{ ...alert, id }, ...p].slice(0, 6)); // max 6 visible
    // auto-dismiss after duration (default 6s, persistent if duration=0)
    if (alert.duration !== 0) {
      setTimeout(() => {
        setAlerts(p => p.filter(a => a.id !== id));
      }, alert.duration || 6000);
    }
  }, []);

  const dismiss = useCallback((id) => {
    setAlerts(p => p.filter(a => a.id !== id));
  }, []);

  // Register global push function
  useEffect(() => {
    _pushAlert = push;
    return () => { _pushAlert = null; };
  }, [push]);

  return { alerts, push, dismiss };
}

export function AlertSystem({ session, settings }) {
  const { alerts, push, dismiss } = useAlerts();
  const lastCountRef = useRef(0);
  const intervalRef  = useRef(null);

  // Poll anomalies endpoint and fire alerts on new detections
  useEffect(() => {
    if (!settings?.alertsEnabled) return;

    const poll = async () => {
      try {
        const r = await fetch("http://localhost:5000/api/anomalies", {
          headers: { "X-API-Key": session.apiKey },
        });
        if (!r.ok) return;
        const j = await r.json();
        const data = j.data || [];
        const active = data.filter(a => a.status === "active" || a.status === "investigating");

        if (lastCountRef.current > 0 && active.length > lastCountRef.current) {
          const newOnes = active.slice(0, active.length - lastCountRef.current);
          newOnes.forEach(a => {
            push({
              title: `New anomaly detected`,
              message: a.title || a.type,
              severity: a.severity || "high",
              duration: a.severity === "critical" ? 0 : 8000, // critical = persistent
            });
          });
        }
        lastCountRef.current = active.length;
      } catch {
        // API offline — ignore silently
      }
    };

    const interval = settings.alertInterval || 30000;
    intervalRef.current = setInterval(poll, interval);
    poll(); // run immediately

    return () => clearInterval(intervalRef.current);
  }, [session, settings, push]);

  // Demo: fire a welcome alert on mount
  useEffect(() => {
    setTimeout(() => {
      push({
        title: "Session started",
        message: `Signed in as ${session.username} (${session.role})`,
        severity: "info",
        duration: 4000,
      });
    }, 800);

    // Simulate a critical alert after 3s for demo purposes
    setTimeout(() => {
      push({
        title: "Critical anomaly active",
        message: "Brute Force on SSH — 247 attempts from 185.220.101.47",
        severity: "critical",
        duration: 0, // must be manually dismissed
      });
    }, 3000);
  }, []);

  if (alerts.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 1000,
      display: "flex", flexDirection: "column", gap: 8,
      width: "min(380px, 90vw)",
      fontFamily: "'IBM Plex Mono','Courier New',monospace",
    }}>
      {alerts.map(alert => {
        const ac = ALERT_COLORS[alert.severity] || ALERT_COLORS.info;
        return (
          <div key={alert.id} style={{
            background: ac.bg, border: `1px solid ${ac.border}`, borderRadius: 9,
            padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,.5)",
            animation: "slideIn .2s ease",
          }}>
            {/* left accent bar */}
            <div style={{
              width: 3, borderRadius: 2, alignSelf: "stretch",
              background: ac.border, flexShrink: 0,
            }}/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 3,
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 600, textTransform: "uppercase",
                  letterSpacing: ".06em", color: ac.text,
                }}>
                  {alert.severity}
                </span>
                {alert.duration === 0 && (
                  <span style={{
                    fontSize: 9, background: ac.border, color: ac.text,
                    padding: "1px 5px", borderRadius: 3, letterSpacing: ".04em",
                  }}>
                    PERSISTENT
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0", marginBottom: 2 }}>
                {alert.title}
              </div>
              <div style={{ fontSize: 11, color: ac.text, opacity: .85 }}>
                {alert.message}
              </div>
            </div>
            <button
              onClick={() => dismiss(alert.id)}
              style={{
                background: "none", border: "none", color: ac.text, opacity: .6,
                cursor: "pointer", fontSize: 16, lineHeight: 1, padding: "0 2px",
                flexShrink: 0,
              }}
            >×</button>
          </div>
        );
      })}
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  alertsEnabled:       true,
  alertInterval:       30000,    // ms
  autoRefresh:         true,
  refreshInterval:     15000,    // ms
  anomalyThresholds: {
    login_failed:      10,
    port_scan:         50,
    data_volume_mb:    100,
    access_denied:     5,
  },
  monitoredEventTypes: ["login_failed","access_denied","brute_force","port_scan","data_breach","malware_detected"],
  apiBaseUrl:          "http://localhost:5000",
};

function Toggle({ value, onChange }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11, cursor: "pointer",
        background: value ? C.accentDim : C.surface,
        border: `1px solid ${value ? C.accent : C.border}`,
        position: "relative", transition: "background .2s, border-color .2s",
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: "50%",
        background: value ? "#fff" : C.muted,
        position: "absolute", top: 2,
        left: value ? 20 : 2,
        transition: "left .2s, background .2s",
      }}/>
    </div>
  );
}

function SettingRow({ label, sub, children }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "14px 0", borderBottom: `1px solid ${C.border}`, gap: 16,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: C.text, marginBottom: sub ? 3 : 0 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>{children}</div>
    </div>
  );
}

function SectionHead({ title }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: C.muted, textTransform: "uppercase",
      letterSpacing: ".08em", marginBottom: 2, marginTop: 24, paddingBottom: 6,
      borderBottom: `1px solid ${C.border}`,
    }}>
      {title}
    </div>
  );
}

export function SettingsPage({ settings, onSave, session, onLogout }) {
  const [local, setLocal]     = useState({ ...DEFAULT_SETTINGS, ...settings });
  const [saved,  setSaved]    = useState(false);
  const [tab,    setTab]      = useState("general");

  const set = (key, val) => setLocal(p => ({ ...p, [key]: val }));
  const setThreshold = (key, val) => setLocal(p => ({
    ...p, anomalyThresholds: { ...p.anomalyThresholds, [key]: Number(val) },
  }));
  const toggleEventType = (type) => {
    setLocal(p => ({
      ...p,
      monitoredEventTypes: p.monitoredEventTypes.includes(type)
        ? p.monitoredEventTypes.filter(t => t !== type)
        : [...p.monitoredEventTypes, type],
    }));
  };

  const save = () => {
    onSave(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const ALL_EVENT_TYPES = [
    "login_success","login_failed","access_denied","brute_force",
    "port_scan","data_breach","malware_detected","config_change",
    "privilege_escalation","other",
  ];

  const TABS = ["general","alerts","thresholds","session"];

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", overflow: "hidden",
      fontFamily: "'IBM Plex Mono','Courier New',monospace",
    }}>
      {/* toolbar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 24px", borderBottom: `1px solid ${C.border}`,
        background: C.surface, flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Settings</div>
        <Btn
          variant="primary"
          onClick={save}
          style={{ opacity: saved ? .7 : 1 }}
        >
          {saved ? "✓ Saved" : "Save changes"}
        </Btn>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* tab sidebar */}
        <div style={{
          width: 180, flexShrink: 0, background: C.surface,
          borderRight: `1px solid ${C.border}`, padding: "14px 10px",
        }}>
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                display: "block", width: "100%", padding: "8px 10px",
                borderRadius: 6, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, textAlign: "left",
                textTransform: "capitalize",
                background: tab === t ? C.card : "none",
                color: tab === t ? C.text : C.muted,
                fontWeight: tab === t ? 600 : 400,
                borderLeft: tab === t ? `2px solid ${C.accent}` : "2px solid transparent",
                marginBottom: 2,
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 28px" }}>

          {/* ── GENERAL ── */}
          {tab === "general" && (
            <div>
              <SectionHead title="Display" />
              <SettingRow label="Auto-refresh data"
                sub="Automatically reload logs and incidents at the interval below">
                <Toggle value={local.autoRefresh} onChange={v => set("autoRefresh", v)} />
              </SettingRow>
              <SettingRow label="Refresh interval"
                sub="How often to poll the API for new data">
                <select
                  value={local.refreshInterval}
                  onChange={e => set("refreshInterval", Number(e.target.value))}
                  style={{
                    background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                    borderRadius: 6, padding: "6px 10px", fontSize: 12, fontFamily: "inherit",
                  }}
                >
                  <option value={10000}>10 seconds</option>
                  <option value={15000}>15 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                </select>
              </SettingRow>

              <SectionHead title="API" />
              <SettingRow label="API base URL"
                sub="The Flask backend URL — change if running on a different port">
                <input
                  value={local.apiBaseUrl}
                  onChange={e => set("apiBaseUrl", e.target.value)}
                  style={{
                    background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                    borderRadius: 6, padding: "7px 12px", fontSize: 12, fontFamily: "monospace",
                    width: 240, outline: "none",
                  }}
                />
              </SettingRow>

              <SectionHead title="Monitored event types" />
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 12, lineHeight: 1.6 }}>
                Only checked event types will trigger anomaly detection and alerts.
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
              }}>
                {ALL_EVENT_TYPES.map(t => (
                  <label key={t} style={{
                    display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
                    padding: "8px 10px", borderRadius: 6,
                    background: local.monitoredEventTypes.includes(t) ? C.dim : C.card,
                    border: `1px solid ${local.monitoredEventTypes.includes(t) ? C.borderHi : C.border}`,
                  }}>
                    <input
                      type="checkbox"
                      checked={local.monitoredEventTypes.includes(t)}
                      onChange={() => toggleEventType(t)}
                      style={{ accentColor: C.accent }}
                    />
                    <span style={{ fontSize: 11, color: C.text }}>{t.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── ALERTS ── */}
          {tab === "alerts" && (
            <div>
              <SectionHead title="Alert notifications" />
              <SettingRow label="Enable alerts"
                sub="Show real-time toast notifications when new anomalies are detected">
                <Toggle value={local.alertsEnabled} onChange={v => set("alertsEnabled", v)} />
              </SettingRow>
              <SettingRow label="Alert polling interval"
                sub="How often to check the API for new anomalies">
                <select
                  value={local.alertInterval}
                  onChange={e => set("alertInterval", Number(e.target.value))}
                  style={{
                    background: C.surface, border: `1px solid ${C.border}`, color: C.text,
                    borderRadius: 6, padding: "6px 10px", fontSize: 12, fontFamily: "inherit",
                  }}
                >
                  <option value={15000}>15 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>1 minute</option>
                  <option value={300000}>5 minutes</option>
                </select>
              </SettingRow>

              <SectionHead title="Alert behaviour" />
              <div style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
                padding: "14px 16px", fontSize: 12, color: C.muted, lineHeight: 1.7,
              }}>
                <div style={{ color: C.text, fontWeight: 600, marginBottom: 6 }}>Alert severity rules</div>
                <div>• <span style={{ color: "#f0abfc" }}>Critical</span> — persistent until manually dismissed</div>
                <div>• <span style={{ color: "#f87171" }}>High</span> — auto-dismissed after 8 seconds</div>
                <div>• <span style={{ color: "#fb923c" }}>Medium</span> — auto-dismissed after 6 seconds</div>
                <div>• <span style={{ color: "#60a5fa" }}>Info</span> — auto-dismissed after 4 seconds</div>
              </div>

              <div style={{ marginTop: 16 }}>
                <Btn
                  variant="default"
                  onClick={() => {
                    // Fire a test alert
                    pushAlert({
                      title: "Test alert",
                      message: "This is a test notification from Settings",
                      severity: "info",
                      duration: 5000,
                    });
                  }}
                >
                  ▶ Fire test alert
                </Btn>
              </div>
            </div>
          )}

          {/* ── THRESHOLDS ── */}
          {tab === "thresholds" && (
            <div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
                Anomaly detection triggers when event counts exceed these thresholds within a 5-minute window.
              </div>

              <SectionHead title="Detection thresholds" />
              {[
                { key:"login_failed",   label:"Failed logins",         unit:"attempts",  min:1,  max:100 },
                { key:"port_scan",      label:"Port scan events",       unit:"ports",     min:1,  max:500 },
                { key:"data_volume_mb", label:"Outbound data volume",   unit:"MB",        min:1,  max:1000 },
                { key:"access_denied",  label:"Access denied events",   unit:"events",    min:1,  max:50 },
              ].map(f => (
                <SettingRow
                  key={f.key}
                  label={f.label}
                  sub={`Trigger anomaly after N ${f.unit} in 5 minutes`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="range"
                      min={f.min} max={f.max}
                      value={local.anomalyThresholds[f.key]}
                      onChange={e => setThreshold(f.key, e.target.value)}
                      style={{ width: 120, accentColor: C.accent }}
                    />
                    <div style={{
                      minWidth: 52, background: C.card, border: `1px solid ${C.border}`,
                      borderRadius: 5, padding: "4px 8px", fontSize: 12, color: C.text,
                      textAlign: "center", fontFamily: "monospace",
                    }}>
                      {local.anomalyThresholds[f.key]}
                    </div>
                  </div>
                </SettingRow>
              ))}
            </div>
          )}

          {/* ── SESSION ── */}
          {tab === "session" && (
            <div>
              <SectionHead title="Current session" />

              <div style={{
                background: C.card, border: `1px solid ${C.border}`, borderRadius: 9,
                padding: "18px 20px", marginBottom: 16,
              }}>
                {[
                  { l: "Username", v: session?.username },
                  { l: "Role",     v: session?.role },
                  { l: "API key",  v: session?.apiKey?.slice(0, 8) + "••••••••" },
                  { l: "Session",  v: "In-memory (expires on close)" },
                ].map(f => (
                  <div key={f.l} style={{
                    display: "flex", gap: 16, padding: "8px 0",
                    borderBottom: `1px solid ${C.border}`, fontSize: 12,
                  }}>
                    <span style={{ color: C.muted, width: 80, flexShrink: 0 }}>{f.l}</span>
                    <span style={{ color: C.text, fontFamily: "monospace" }}>{f.v}</span>
                  </div>
                ))}
              </div>

              <div style={{
                background: "#0c1a2e", border: `1px solid #1e40af`, borderRadius: 8,
                padding: "12px 14px", fontSize: 11, color: "#60a5fa",
                marginBottom: 20, lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Role permissions</div>
                {session?.role === "admin"
                  ? "Admin — full access: read, write, delete, run anomaly detection, export data."
                  : "Analyst — read-only access: view logs, incidents, reports. Cannot modify or delete."
                }
              </div>

              <Btn variant="danger" onClick={onLogout}>
                Sign out
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}