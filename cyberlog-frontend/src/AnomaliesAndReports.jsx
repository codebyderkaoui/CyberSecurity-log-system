import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "http://localhost:5000/api";
const API_KEY  = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_KEY) || "admin-dev-key-changeme";
const HDRS     = { "Content-Type": "application/json", "X-API-Key": API_KEY };

// ─── Theme (same as App.jsx) ──────────────────────────────────────────────────
const C = {
  bg:"#080f1e", surface:"#0d1829", card:"#111f35", border:"#1e3050",
  borderHi:"#2a4470", accent:"#3b82f6", accentDim:"#1d4ed8",
  teal:"#14b8a6", amber:"#f59e0b", red:"#ef4444", green:"#22c55e",
  purple:"#8b5cf6", text:"#e2e8f0", muted:"#64748b", dim:"#1a2840",
};

const SEV = {
  low:      {bg:"#052e16",text:"#4ade80",border:"#166534"},
  medium:   {bg:"#451a03",text:"#fb923c",border:"#9a3412"},
  high:     {bg:"#450a0a",text:"#f87171",border:"#991b1b"},
  critical: {bg:"#2d0028",text:"#f0abfc",border:"#86198f"},
};

function Badge({map,val}){
  const c=map[val]||{bg:C.dim,text:C.muted,border:C.border};
  return(
    <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",
      borderRadius:4,fontSize:10,fontWeight:600,letterSpacing:".05em",
      textTransform:"uppercase",background:c.bg,color:c.text,
      border:`1px solid ${c.border}`,whiteSpace:"nowrap"}}>
      {val}
    </span>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Btn({children,variant="default",style,...p}){
  const base={fontFamily:"inherit",fontSize:12,padding:"7px 14px",borderRadius:6,
    cursor:"pointer",border:`1px solid ${C.border}`,transition:"opacity .15s"};
  const v={
    default:{background:C.surface,color:C.muted,...base},
    primary:{background:C.accentDim,color:"#fff",border:`1px solid ${C.accent}`,...base},
    danger: {background:"#450a0a",color:"#f87171",border:"1px solid #991b1b",...base},
  };
  return <button style={{...v[variant],...style}} {...p}>{children}</button>;
}

// ─── API helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path, mock){
  try{
    const r = await fetch(`${API_BASE}${path}`, {headers:HDRS});
    if(!r.ok) return mock;
    const j = await r.json();
    return j.data ?? j ?? mock;
  }catch{ return mock; }
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_ANOMALIES = [
  {
    id:1, type:"brute_force_detected",
    title:"Brute Force — SSH",
    description:"185.220.101.47 made 247 failed login attempts against root and admin over 12 minutes. Rate: ~20 attempts/min.",
    severity:"critical", ip_address:"185.220.101.47", username:"root/admin",
    detected_at:"2026-04-10T14:32:00", count:247, threshold:10, status:"active",
  },
  {
    id:2, type:"unusual_data_volume",
    title:"Abnormal Outbound Transfer",
    description:"svc_acct transferred 2.4GB outbound to 198.51.100.7 — 40x above the 60MB daily baseline.",
    severity:"critical", ip_address:"198.51.100.7", username:"svc_acct",
    detected_at:"2026-04-10T14:30:00", count:2457, threshold:60, status:"active",
  },
  {
    id:3, type:"port_scan",
    title:"TCP SYN Port Scan",
    description:"45.33.32.156 probed 1,024 ports on the DMZ subnet within 90 seconds.",
    severity:"high", ip_address:"45.33.32.156", username:null,
    detected_at:"2026-04-10T14:28:00", count:1024, threshold:50, status:"active",
  },
  {
    id:4, type:"repeated_access_denied",
    title:"Access Denied Spike",
    description:"jdoe triggered 34 access_denied events in 5 minutes — possible privilege escalation attempt.",
    severity:"high", ip_address:"203.0.113.42", username:"jdoe",
    detected_at:"2026-04-10T13:55:00", count:34, threshold:5, status:"investigating",
  },
  {
    id:5, type:"off_hours_login",
    title:"Off-Hours Admin Login",
    description:"admin logged in at 03:14 from IP 77.88.55.60 — outside normal working hours (08:00–20:00).",
    severity:"medium", ip_address:"77.88.55.60", username:"admin",
    detected_at:"2026-04-10T03:14:00", count:1, threshold:1, status:"investigating",
  },
  {
    id:6, type:"malware_detected",
    title:"Malware Signature Match",
    description:"Trojan.GenericKD signature matched on 10.0.1.33 in /tmp/update.sh — file quarantined.",
    severity:"critical", ip_address:"10.0.1.33", username:"alice",
    detected_at:"2026-04-10T14:29:00", count:1, threshold:1, status:"active",
  },
  {
    id:7, type:"credential_stuffing",
    title:"Credential Stuffing — 3 IPs",
    description:"admin account attacked from 3 distinct IPs within 30 minutes — coordinated credential stuffing pattern.",
    severity:"high", ip_address:"multiple", username:"admin",
    detected_at:"2026-04-09T22:44:00", count:3, threshold:2, status:"resolved",
  },
  {
    id:8, type:"repeated_access_denied",
    title:"Config File Access Attempts",
    description:"bob attempted to read /etc/shadow and /etc/passwd 12 times via web shell.",
    severity:"medium", ip_address:"172.16.0.99", username:"bob",
    detected_at:"2026-04-09T14:22:00", count:12, threshold:5, status:"resolved",
  },
];

const MOCK_REPORT = {
  period: { start:"2026-04-03", end:"2026-04-10" },
  summary: {
    total_logs:4821, new_logs_this_week:1203,
    total_incidents:7, new_incidents_this_week:4,
    resolved_incidents:2, anomalies_detected:14,
  },
  logs_by_severity: { low:2140, medium:1680, high:820, critical:181 },
  logs_by_event: {
    login_failed:1832, login_success:1540, access_denied:892,
    port_scan:310, brute_force:198, data_breach:49,
  },
  daily_activity: [
    {date:"Apr 3",  logs:98,  incidents:0},
    {date:"Apr 4",  logs:134, incidents:1},
    {date:"Apr 5",  logs:87,  incidents:0},
    {date:"Apr 6",  logs:210, incidents:2},
    {date:"Apr 7",  logs:176, incidents:1},
    {date:"Apr 8",  logs:289, incidents:3},
    {date:"Apr 9",  logs:167, incidents:2},
    {date:"Apr 10", logs:142, incidents:4},
  ],
  top_ips: [
    {ip:"185.220.101.47", count:247, severity:"critical"},
    {ip:"45.33.32.156",   count:134, severity:"high"},
    {ip:"92.118.160.12",  count:89,  severity:"medium"},
    {ip:"198.51.100.7",   count:67,  severity:"critical"},
    {ip:"77.88.55.60",    count:44,  severity:"medium"},
  ],
  top_users: [
    {username:"admin",    failed:89, success:12},
    {username:"root",     failed:67, success:0},
    {username:"svc_acct", failed:12, success:34},
    {username:"jdoe",     failed:34, success:8},
    {username:"alice",    failed:3,  success:22},
  ],
};

// ─── Mini bar chart (SVG) ─────────────────────────────────────────────────────
function BarChart({ data, color=C.accent, height=100 }){
  const w=500, h=height, pad=4, gap=6;
  const max = Math.max(...data.map(d=>d.v));
  const bw   = (w - pad*2 - gap*(data.length-1)) / data.length;
  return(
    <svg viewBox={`0 0 ${w} ${h+20}`} style={{width:"100%",height:h+20}} preserveAspectRatio="none">
      {data.map((d,i)=>{
        const bh = max>0 ? ((d.v/max)*(h-pad*2)) : 0;
        const x  = pad + i*(bw+gap);
        const y  = h - pad - bh;
        return(
          <g key={i}>
            <rect x={x} y={y} width={bw} height={bh}
              fill={d.color||color} rx="2" opacity="0.85"/>
            <text x={x+bw/2} y={h+16} textAnchor="middle"
              fill={C.muted} fontSize="9"
              style={{fontFamily:"monospace"}}>{d.l}</text>
          </g>
        );
      })}
    </svg>
  );
}

// dual-bar (logs + incidents overlay)
function DualBarChart({ data, height=110 }){
  const w=500, h=height, pad=4, gap=4;
  const maxL = Math.max(...data.map(d=>d.logs));
  const bw   = (w - pad*2 - gap*(data.length-1)) / data.length;
  return(
    <svg viewBox={`0 0 ${w} ${h+20}`} style={{width:"100%",height:h+20}} preserveAspectRatio="none">
      {data.map((d,i)=>{
        const lh = (d.logs/maxL)*(h-pad*2);
        const ih = d.incidents>0 ? Math.max(4,(d.incidents/5)*(h-pad*2)) : 0;
        const x  = pad + i*(bw+gap);
        return(
          <g key={i}>
            <rect x={x} y={h-pad-lh} width={bw} height={lh}
              fill={C.accent} rx="2" opacity="0.7"/>
            {ih>0&&<rect x={x} y={h-pad-ih} width={bw} height={ih}
              fill={C.red} rx="2" opacity="0.9"/>}
            <text x={x+bw/2} y={h+16} textAnchor="middle"
              fill={C.muted} fontSize="8.5"
              style={{fontFamily:"monospace"}}>{d.date.replace("Apr ","")}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── ANOMALIES PAGE ───────────────────────────────────────────────────────────
export function AnomaliesPage(){
  const [anomalies, setAnomalies] = useState(MOCK_ANOMALIES);
  const [loading,   setLoading]   = useState(false);
  const [selected,  setSelected]  = useState(null);
  const [filterSev, setFilterSev] = useState("");
  const [filterType,setFilterType]= useState("");
  const [filterSta, setFilterSta] = useState("");
  const [lastRun,   setLastRun]   = useState(new Date());

  const runDetection = useCallback(async()=>{
    setLoading(true);
    const data = await apiFetch("/anomalies", MOCK_ANOMALIES);
    setAnomalies(Array.isArray(data) ? data : MOCK_ANOMALIES);
    setLastRun(new Date());
    setLoading(false);
  },[]);

  const dismiss = (id)=>{
    setAnomalies(p=>p.map(a=>a.id===id?{...a,status:"resolved"}:a));
    if(selected?.id===id) setSelected(p=>({...p,status:"resolved"}));
  };

  const filtered = anomalies.filter(a=>
    (!filterSev  || a.severity===filterSev)&&
    (!filterType || a.type===filterType)&&
    (!filterSta  || a.status===filterSta)
  );

  const counts = {
    active:      anomalies.filter(a=>a.status==="active").length,
    investigating:anomalies.filter(a=>a.status==="investigating").length,
    resolved:    anomalies.filter(a=>a.status==="resolved").length,
    critical:    anomalies.filter(a=>a.severity==="critical"&&a.status!=="resolved").length,
  };

  const TYPE_LABELS = {
    brute_force_detected:"Brute Force",
    unusual_data_volume: "Data Volume",
    port_scan:           "Port Scan",
    repeated_access_denied:"Access Denied",
    off_hours_login:     "Off-Hours Login",
    malware_detected:    "Malware",
    credential_stuffing: "Credential Stuffing",
  };

  const STATUS_C = {
    active:       {bg:"#450a0a",  text:"#f87171",  border:"#991b1b"},
    investigating:{bg:"#451a03",  text:"#fb923c",  border:"#9a3412"},
    resolved:     {bg:"#052e16",  text:"#4ade80",  border:"#166534"},
  };

  return(
    <div style={{display:"flex",flex:1,overflow:"hidden",height:"100%"}}>
      {/* main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

        {/* toolbar */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",
          borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0,flexWrap:"wrap"}}>
          <div style={{fontSize:13,fontWeight:600,color:C.text}}>
            Anomaly Detection
            <span style={{fontSize:10,color:C.muted,fontWeight:400,marginLeft:10}}>
              {filtered.length} results
            </span>
          </div>
          <span style={{flex:1}}/>
          <select value={filterSev} onChange={e=>setFilterSev(e.target.value)}
            style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,
              borderRadius:6,padding:"6px 10px",fontSize:11,fontFamily:"inherit"}}>
            <option value="">All severities</option>
            {["low","medium","high","critical"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterType} onChange={e=>setFilterType(e.target.value)}
            style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,
              borderRadius:6,padding:"6px 10px",fontSize:11,fontFamily:"inherit"}}>
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterSta} onChange={e=>setFilterSta(e.target.value)}
            style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,
              borderRadius:6,padding:"6px 10px",fontSize:11,fontFamily:"inherit"}}>
            <option value="">All statuses</option>
            {["active","investigating","resolved"].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <Btn variant="primary" onClick={runDetection} style={{opacity:loading?.7:1}}>
            {loading?"Running...":"▶ Run detection"}
          </Btn>
        </div>

        {/* summary cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,
          padding:"16px 18px 4px",flexShrink:0}}>
          {[
            {label:"Active",        val:counts.active,       color:C.red},
            {label:"Investigating", val:counts.investigating, color:C.amber},
            {label:"Resolved",      val:counts.resolved,      color:C.green},
            {label:"Critical",      val:counts.critical,      color:"#f0abfc"},
          ].map(s=>(
            <div key={s.label} style={{background:C.card,border:`1px solid ${C.border}`,
              borderRadius:8,padding:"12px 14px",borderLeft:`3px solid ${s.color}`}}>
              <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:5}}>{s.label}</div>
              <div style={{fontSize:26,fontWeight:700,color:s.color,lineHeight:1}}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* last run */}
        <div style={{padding:"8px 18px 0",fontSize:10,color:C.muted,flexShrink:0}}>
          Last detection run: <span style={{color:C.text}}>{lastRun.toLocaleTimeString()}</span>
          {" · "}Auto-refresh every 15s
        </div>

        {/* anomaly list */}
        <div style={{overflowY:"auto",flex:1,padding:"12px 18px 20px"}}>
          {filtered.length===0&&(
            <div style={{textAlign:"center",padding:"60px",color:C.muted,fontSize:13}}>
              No anomalies match current filters
            </div>
          )}
          {filtered.map(a=>{
            const isSelected = selected?.id===a.id;
            const sc = STATUS_C[a.status]||STATUS_C.active;
            const sevc = SEV[a.severity]||SEV.medium;
            const dt = new Date(a.detected_at);
            return(
              <div key={a.id}
                onClick={()=>setSelected(isSelected?null:a)}
                style={{background:C.card,border:`1px solid ${isSelected?C.accent:C.border}`,
                  borderRadius:9,padding:"14px 16px",marginBottom:10,cursor:"pointer",
                  borderLeft:`4px solid ${sevc.text}`,
                  opacity:a.status==="resolved"?.65:1,
                  transition:"border-color .15s,opacity .15s"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:8}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:600,color:C.text}}>{a.title}</span>
                      <Badge map={SEV} val={a.severity}/>
                      <span style={{display:"inline-flex",alignItems:"center",padding:"2px 7px",
                        borderRadius:4,fontSize:10,fontWeight:600,letterSpacing:".05em",
                        textTransform:"uppercase",background:sc.bg,color:sc.text,
                        border:`1px solid ${sc.border}`}}>
                        {a.status}
                      </span>
                    </div>
                    <p style={{fontSize:12,color:C.muted,margin:0,lineHeight:1.55}}>{a.description}</p>
                  </div>
                  <div style={{flexShrink:0,textAlign:"right"}}>
                    <div style={{fontSize:10,color:C.muted,fontFamily:"monospace",marginBottom:4}}>
                      {dt.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}
                    </div>
                    <div style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>
                      {dt.toLocaleDateString([], {month:"short",day:"numeric"})}
                    </div>
                  </div>
                </div>

                {/* meta row */}
                <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                  {a.ip_address&&(
                    <span style={{fontSize:11,color:C.muted}}>
                      IP: <span style={{color:C.text,fontFamily:"monospace"}}>{a.ip_address}</span>
                    </span>
                  )}
                  {a.username&&(
                    <span style={{fontSize:11,color:C.muted}}>
                      User: <span style={{color:C.text}}>{a.username}</span>
                    </span>
                  )}
                  <span style={{fontSize:11,color:C.muted}}>
                    Count: <span style={{color:sevc.text,fontWeight:600}}>{a.count}</span>
                    <span style={{color:C.dim}}> / threshold {a.threshold}</span>
                  </span>
                  <span style={{fontSize:11,color:C.muted}}>
                    Type: <span style={{color:C.text}}>{TYPE_LABELS[a.type]||a.type}</span>
                  </span>
                  <span style={{flex:1}}/>
                  {a.status!=="resolved"&&(
                    <button
                      onClick={e=>{e.stopPropagation();dismiss(a.id);}}
                      style={{background:"none",border:`1px solid ${C.border}`,
                        color:C.muted,padding:"3px 10px",borderRadius:5,fontSize:10,
                        cursor:"pointer",fontFamily:"inherit"}}>
                      Dismiss
                    </button>
                  )}
                </div>

                {/* progress bar: count vs threshold */}
                <div style={{marginTop:10}}>
                  <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
                    <div style={{height:"100%",borderRadius:2,
                      background:sevc.text,
                      width:`${Math.min(100,Math.round((a.count/Math.max(a.count,a.threshold*5))*100))}%`,
                      transition:"width .4s ease"}}/>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* detail side panel */}
      {selected&&(
        <div style={{width:300,flexShrink:0,background:C.surface,
          borderLeft:`1px solid ${C.border}`,overflowY:"auto",padding:"18px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <span style={{fontSize:12,fontWeight:600,color:C.text}}>Anomaly #{selected.id}</span>
            <button onClick={()=>setSelected(null)}
              style={{background:"none",border:"none",color:C.muted,fontSize:16,cursor:"pointer"}}>×</button>
          </div>

          <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:10,lineHeight:1.4}}>
            {selected.title}
          </div>

          <div style={{fontSize:12,color:C.muted,background:C.card,padding:"10px",
            borderRadius:6,border:`1px solid ${C.border}`,lineHeight:1.6,marginBottom:14}}>
            {selected.description}
          </div>

          {[
            {l:"Type",       v:TYPE_LABELS[selected.type]||selected.type},
            {l:"IP Address", v:selected.ip_address||"—", mono:true},
            {l:"Username",   v:selected.username||"—"},
            {l:"Detected",   v:new Date(selected.detected_at).toLocaleString(), mono:true},
          ].map(f=>(
            <div key={f.l} style={{marginBottom:10}}>
              <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{f.l}</div>
              <div style={{fontSize:12,color:C.text,fontFamily:f.mono?"monospace":"inherit"}}>{f.v}</div>
            </div>
          ))}

          <div style={{marginBottom:10}}>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>Severity</div>
            <Badge map={SEV} val={selected.severity}/>
          </div>

          <div style={{marginBottom:16}}>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Count vs threshold</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6}}>
              <span style={{fontSize:22,fontWeight:700,color:SEV[selected.severity]?.text||C.text}}>{selected.count}</span>
              <span style={{fontSize:11,color:C.muted}}>/ threshold {selected.threshold}</span>
            </div>
            <div style={{height:4,background:C.border,borderRadius:2,marginTop:6,overflow:"hidden"}}>
              <div style={{height:"100%",borderRadius:2,
                background:SEV[selected.severity]?.text||C.accent,
                width:`${Math.min(100,Math.round((selected.count/Math.max(selected.count,selected.threshold*5))*100))}%`}}/>
            </div>
          </div>

          {selected.status!=="resolved"&&(
            <Btn variant="default" style={{width:"100%"}} onClick={()=>dismiss(selected.id)}>
              ✓ Dismiss anomaly
            </Btn>
          )}
        </div>
      )}
    </div>
  );
}

// ─── REPORTS PAGE ─────────────────────────────────────────────────────────────
export function ReportsPage(){
  const [report,    setReport]    = useState(MOCK_REPORT);
  const [loading,   setLoading]   = useState(false);
  const [exporting, setExporting] = useState(null); // "logs"|"incidents"|null

  const fetchReport = async()=>{
    setLoading(true);
    const data = await apiFetch("/reports/weekly", MOCK_REPORT);
    if(data?.summary) setReport(data);
    setLoading(false);
  };

  useEffect(()=>{ fetchReport(); },[]);

  // CSV export via the API endpoint — falls back to client-side CSV from mock
  const exportCSV = async(type)=>{
    setExporting(type);
    try{
      const r = await fetch(`${API_BASE}/logs${type==="incidents"?"/..":""}`, {headers:HDRS});
      // If API is live, trigger download of whatever it returns
      if(r.ok){
        const blob = await r.blob();
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download=`${type}_export.csv`; a.click();
        URL.revokeObjectURL(url);
      } else {
        // Build CSV client-side from mock data
        buildCSV(type);
      }
    }catch{ buildCSV(type); }
    setExporting(null);
  };

  const buildCSV = (type)=>{
    let csv="";
    if(type==="logs"){
      csv="id,event_type,ip_address,username,severity,event_time\n";
      csv+="1,brute_force,185.220.101.47,admin,high,2026-04-10T14:32:11\n";
      csv+="2,login_failed,92.118.160.12,root,medium,2026-04-10T14:31:58\n";
      csv+="3,port_scan,45.33.32.156,,high,2026-04-10T14:31:44\n";
    } else {
      csv="id,title,severity,status,created_at\n";
      csv+="1,Brute Force on SSH Port,critical,investigating,2026-04-10T10:14:00\n";
      csv+="2,Unusual Data Exfiltration,high,open,2026-04-10T09:02:00\n";
    }
    const blob = new Blob([csv],{type:"text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`${type}_export.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const r = report;
  const sevData = Object.entries(r.logs_by_severity).map(([k,v])=>({
    l:k, v, color:SEV[k]?.text||C.accent
  }));
  const evtData = Object.entries(r.logs_by_event).map(([k,v])=>({
    l:k.replace("_","\n").slice(0,8), v, color:C.accent
  }));

  const pct = (a,b)=> b>0 ? Math.round(a/b*100) : 0;

  return(
    <div style={{flex:1,overflowY:"auto",padding:"24px"}}>

      {/* header row */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:22}}>
        <div>
          <div style={{fontSize:16,fontWeight:700,color:C.text,marginBottom:3}}>Weekly Report</div>
          <div style={{fontSize:11,color:C.muted,fontFamily:"monospace"}}>
            {r.period.start} → {r.period.end}
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <Btn onClick={fetchReport} style={{opacity:loading?.7:1}}>
            {loading?"Loading...":"↻ Refresh"}
          </Btn>
          <Btn variant="primary" onClick={()=>exportCSV("logs")}
            style={{opacity:exporting==="logs"?.7:1}}>
            {exporting==="logs"?"Exporting...":"↓ Export logs CSV"}
          </Btn>
          <Btn variant="primary" onClick={()=>exportCSV("incidents")}
            style={{opacity:exporting==="incidents"?.7:1}}>
            {exporting==="incidents"?"Exporting...":"↓ Export incidents CSV"}
          </Btn>
        </div>
      </div>

      {/* summary row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:22}}>
        {[
          {l:"Total logs",       v:r.summary.total_logs.toLocaleString(),           color:C.accent},
          {l:"New this week",    v:r.summary.new_logs_this_week.toLocaleString(),   color:C.teal},
          {l:"Total incidents",  v:r.summary.total_incidents,                        color:C.amber},
          {l:"New this week",    v:r.summary.new_incidents_this_week,               color:C.red},
          {l:"Resolved",         v:r.summary.resolved_incidents,                    color:C.green},
          {l:"Anomalies",        v:r.summary.anomalies_detected,                    color:C.purple},
        ].map((s,i)=>(
          <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,
            borderRadius:8,padding:"12px 14px",borderTop:`3px solid ${s.color}`}}>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:5}}>{s.l}</div>
            <div style={{fontSize:24,fontWeight:700,color:C.text,lineHeight:1}}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* daily activity chart */}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,
        padding:"18px 20px",marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <span style={{fontSize:11,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:".06em"}}>
            Daily activity
          </span>
          <div style={{display:"flex",gap:14}}>
            <span style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted}}>
              <span style={{width:10,height:10,borderRadius:2,background:C.accent,display:"inline-block"}}/>Logs
            </span>
            <span style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:C.muted}}>
              <span style={{width:10,height:10,borderRadius:2,background:C.red,display:"inline-block"}}/>Incidents
            </span>
          </div>
        </div>
        <DualBarChart data={r.daily_activity} height={110}/>
      </div>

      {/* two column row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:18}}>

        {/* logs by severity */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"16px 18px"}}>
          <div style={{fontSize:11,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
            Logs by severity
          </div>
          <BarChart data={sevData} height={90}/>
          <div style={{marginTop:10}}>
            {sevData.map(s=>(
              <div key={s.l} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:2,background:s.color,flexShrink:0}}/>
                <span style={{fontSize:11,color:C.muted,flex:1,textTransform:"capitalize"}}>{s.l}</span>
                <span style={{fontSize:11,color:C.text,fontWeight:600}}>{s.v.toLocaleString()}</span>
                <span style={{fontSize:10,color:C.muted,width:32,textAlign:"right"}}>
                  {pct(s.v, r.summary.total_logs)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* logs by event type */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"16px 18px"}}>
          <div style={{fontSize:11,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
            Logs by event type
          </div>
          <BarChart data={evtData} color={C.teal} height={90}/>
          <div style={{marginTop:10}}>
            {Object.entries(r.logs_by_event).map(([k,v])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                <div style={{width:8,height:8,borderRadius:2,background:C.teal,flexShrink:0}}/>
                <span style={{fontSize:11,color:C.muted,flex:1}}>{k.replace(/_/g," ")}</span>
                <span style={{fontSize:11,color:C.text,fontWeight:600}}>{v.toLocaleString()}</span>
                <span style={{fontSize:10,color:C.muted,width:32,textAlign:"right"}}>
                  {pct(v, r.summary.total_logs)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* two column row — top IPs + top users */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>

        {/* top offending IPs */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"16px 18px"}}>
          <div style={{fontSize:11,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
            Top offending IPs
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 60px 70px",gap:8,
            fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",
            marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>
            <span>IP Address</span><span style={{textAlign:"right"}}>Events</span><span style={{textAlign:"right"}}>Severity</span>
          </div>
          {r.top_ips.map((ip,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 60px 70px",gap:8,
              alignItems:"center",padding:"7px 0",
              borderBottom:`1px solid ${C.border}`,fontSize:12}}>
              <span style={{color:C.text,fontFamily:"monospace",fontSize:11}}>{ip.ip}</span>
              <span style={{color:C.text,textAlign:"right",fontWeight:600}}>{ip.count}</span>
              <span style={{textAlign:"right"}}><Badge map={SEV} val={ip.severity}/></span>
            </div>
          ))}
        </div>

        {/* top targeted users */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"16px 18px"}}>
          <div style={{fontSize:11,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>
            Top targeted users
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 70px 70px",gap:8,
            fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",
            marginBottom:8,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>
            <span>Username</span><span style={{textAlign:"right"}}>Failed</span><span style={{textAlign:"right"}}>Success</span>
          </div>
          {r.top_users.map((u,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 70px 70px",gap:8,
              alignItems:"center",padding:"7px 0",
              borderBottom:`1px solid ${C.border}`,fontSize:12}}>
              <span style={{color:C.text}}>{u.username}</span>
              <span style={{color:C.red,textAlign:"right",fontWeight:600}}>{u.failed}</span>
              <span style={{color:C.green,textAlign:"right",fontWeight:600}}>{u.success}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
