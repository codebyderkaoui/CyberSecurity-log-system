import { useState, useEffect, useCallback } from "react";
import { AnomaliesPage, ReportsPage } from './AnomaliesAndReports';
import { LoginPage, AlertSystem, SettingsPage, DEFAULT_SETTINGS } from './LoginAlertSettings';

const API_BASE = "http://localhost:5000/api";

function makeHeaders(session) {
  return {
    "Content-Type": "application/json",
    "X-API-Key": session?.apiKey || (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_KEY) || "admin-dev-key-changeme",
  };
}

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
const STA = {
  open:          {bg:"#0c1a2e",text:"#60a5fa",border:"#1e40af"},
  investigating: {bg:"#451a03",text:"#fb923c",border:"#9a3412"},
  resolved:      {bg:"#052e16",text:"#4ade80",border:"#166534"},
};

async function apiFetch(path, session) {
  const r = await fetch(`${API_BASE}${path}`, { headers: makeHeaders(session) });
  if (!r.ok) throw new Error(`API error ${r.status}`);
  const j = await r.json();
  return j.data ?? j;
}
async function apiPost(path, body, session) {
  try {
    const r = await fetch(`${API_BASE}${path}`, { method:"POST", headers:makeHeaders(session), body:JSON.stringify(body) });
    const j = await r.json();
    return { ok: r.ok, ...j };
  } catch { return { ok: false }; }
}
async function apiPatch(path, body, session) {
  try {
    const r = await fetch(`${API_BASE}${path}`, { method:"PATCH", headers:makeHeaders(session), body:JSON.stringify(body) });
    return r.ok;
  } catch { return false; }
}
async function apiDelete(path, session) {
  try {
    const r = await fetch(`${API_BASE}${path}`, { method:"DELETE", headers:makeHeaders(session) });
    return r.ok;
  } catch { return false; }
}

function Input({style,...p}){ return <input style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"7px 12px",fontSize:12,fontFamily:"inherit",outline:"none",width:"100%",...style}} {...p}/>; }
function Select({style,children,...p}){ return <select style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"7px 10px",fontSize:12,fontFamily:"inherit",outline:"none",...style}} {...p}>{children}</select>; }
function Btn({children,variant="default",style,...p}){
  const base={fontFamily:"inherit",fontSize:12,padding:"7px 14px",borderRadius:6,cursor:"pointer",border:`1px solid ${C.border}`,transition:"opacity .15s"};
  const v={default:{background:C.surface,color:C.muted,...base},primary:{background:C.accentDim,color:"#fff",border:`1px solid ${C.accent}`,...base},danger:{background:"#450a0a",color:"#f87171",border:"1px solid #991b1b",...base},ghost:{background:"none",color:C.muted,...base}};
  return <button style={{...v[variant],...style}} {...p}>{children}</button>;
}
function Badge({map,val}){
  const c=map[val]||{bg:C.dim,text:C.muted,border:C.border};
  return <span style={{display:"inline-flex",alignItems:"center",padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:600,letterSpacing:".05em",textTransform:"uppercase",background:c.bg,color:c.text,border:`1px solid ${c.border}`,whiteSpace:"nowrap"}}>{val}</span>;
}
function Modal({title,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{background:C.card,border:`1px solid ${C.borderHi}`,borderRadius:12,width:"min(560px,92vw)",maxHeight:"80vh",overflow:"auto"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:`1px solid ${C.border}`}}>
          <span style={{fontWeight:600,fontSize:14,color:C.text}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer",lineHeight:1}}>x</button>
        </div>
        <div style={{padding:"20px"}}>{children}</div>
      </div>
    </div>
  );
}
function toast(msg,color=C.green){
  const el=document.createElement("div");
  el.textContent=msg;
  Object.assign(el.style,{position:"fixed",bottom:"80px",right:"24px",background:C.card,border:`1px solid ${color}`,color,padding:"10px 18px",borderRadius:8,fontSize:12,fontFamily:"monospace",zIndex:300,boxShadow:"0 4px 20px rgba(0,0,0,.4)"});
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2500);
}
function Spinner(){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,flexDirection:"column",gap:12}}>
      <div style={{width:28,height:28,border:`2px solid ${C.border}`,borderTopColor:C.accent,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <span style={{fontSize:11,color:C.muted}}>Loading...</span>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}
function ErrorState({message,onRetry}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1,flexDirection:"column",gap:14}}>
      <div style={{fontSize:28}}>!</div>
      <div style={{fontSize:13,color:C.red,fontWeight:600}}>Failed to load data</div>
      <div style={{fontSize:11,color:C.muted,textAlign:"center",maxWidth:360,lineHeight:1.6}}>
        {message||"Could not reach the API. Make sure your Flask server is running."}
      </div>
      {onRetry&&<Btn variant="primary" onClick={onRetry}>Retry</Btn>}
    </div>
  );
}
function DonutChart({data}){
  const colors=[C.accent,C.teal,C.amber,C.red,C.purple,"#ec4899"];
  const total=data.reduce((s,d)=>s+d.count,0)||1;
  const r=38,cx=50,cy=50,circ=2*Math.PI*r,sw=12;
  let off=0;
  return(
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={sw}/>
      {data.map((d,i)=>{ const dash=(d.count/total)*circ; const s=<circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={colors[i%colors.length]} strokeWidth={sw} strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={circ/4-off}/>; off+=dash; return s; })}
      <text x={cx} y={cy-5} textAnchor="middle" fill={C.text} fontSize="13" fontWeight="700" style={{fontFamily:"monospace"}}>{(total/1000).toFixed(1)}k</text>
      <text x={cx} y={cy+10} textAnchor="middle" fill={C.muted} fontSize="8" style={{fontFamily:"monospace"}}>total</text>
    </svg>
  );
}

const NAV=[
  {id:"dashboard",label:"Dashboard",icon:"M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"},
  {id:"logs",label:"Logs",icon:"M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"},
  {id:"incidents",label:"Incidents",icon:"M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"},
  {id:"anomalies",label:"Anomalies",icon:"M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"},
  {id:"reports",label:"Reports",icon:"M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"},
  {id:"settings",label:"Settings",icon:"M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"},
];
function Sidebar({page,setPage,health,session}){
  return(
    <div style={{width:200,flexShrink:0,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",height:"100vh"}}>
      <div style={{padding:"18px 16px 14px",borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:7,background:C.accentDim,border:`1px solid ${C.accent}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.accent} strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div>
            <div style={{fontSize:13,fontWeight:700,letterSpacing:".06em",color:C.text}}>CYBERLOG</div>
            <div style={{fontSize:9,color:C.muted}}>SOC Dashboard</div>
          </div>
        </div>
      </div>
      <nav style={{padding:"12px 8px",flex:1}}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)}
            style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"9px 10px",borderRadius:7,border:"none",cursor:"pointer",textAlign:"left",background:page===n.id?C.card:"none",color:page===n.id?C.text:C.muted,fontFamily:"inherit",fontSize:12,fontWeight:page===n.id?600:400,borderLeft:page===n.id?`2px solid ${C.accent}`:"2px solid transparent",marginBottom:2}}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}><path d={n.icon} strokeLinecap="round" strokeLinejoin="round"/></svg>
            {n.label}
          </button>
        ))}
      </nav>
      <div style={{padding:"12px 14px",borderTop:`1px solid ${C.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
          <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,background:health==="ok"?C.green:health==="error"?C.red:C.amber}}/>
          <span style={{fontSize:10,color:C.muted}}>{health==="ok"?"API live":health==="error"?"API offline":"connecting"}</span>
        </div>
        {session&&<div style={{fontSize:10,color:C.dim}}>{session.username} - {session.role}</div>}
      </div>
    </div>
  );
}

function DashboardPage({session}){
  const [logs,setLogs]=useState([]);
  const [incidents,setIncidents]=useState([]);
  const [evtData,setEvtData]=useState([]);
  const [stats,setStats]=useState({total_logs:0,logs_today:0,open_incidents:0,critical_incidents:0,anomalies_detected:0,resolved_today:0});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);

  const load=useCallback(async()=>{
    setLoading(true);setError(null);
    try{
      const [logsData,incData]=await Promise.all([apiFetch("/logs",session),apiFetch("/incidents",session)]);
      const lg=Array.isArray(logsData)?logsData:[];
      const ic=Array.isArray(incData)?incData:[];
      setLogs(lg);setIncidents(ic);
      const today=new Date().toDateString();
      const logsToday=lg.filter(l=>new Date(l.event_time).toDateString()===today).length;
      const evtMap={};
      lg.forEach(l=>{evtMap[l.event_type]=(evtMap[l.event_type]||0)+1;});
      const built=Object.entries(evtMap).map(([event_type,count])=>({event_type,count})).sort((a,b)=>b.count-a.count).slice(0,6);
      setEvtData(built);
      const open=ic.filter(i=>i.status!=="resolved").length;
      const crit=ic.filter(i=>i.severity==="critical"&&i.status!=="resolved").length;
      const res=ic.filter(i=>i.status==="resolved").length;
      setStats({total_logs:lg.length,logs_today:logsToday,open_incidents:open,critical_incidents:crit,anomalies_detected:0,resolved_today:res});
    }catch(e){setError(e.message);}
    setLoading(false);
  },[session]);

  useEffect(()=>{load();},[load]);
  useEffect(()=>{const id=setInterval(load,15000);return()=>clearInterval(id);},[load]);

  if(loading) return <Spinner/>;
  if(error)   return <ErrorState message={error} onRetry={load}/>;

  const total=evtData.reduce((s,e)=>s+e.count,0)||1;
  const colors=[C.accent,C.teal,C.amber,C.red,C.purple,"#ec4899"];
  const rel=ts=>{const d=Math.floor((Date.now()-new Date(ts))/1000);return d<60?`${d}s ago`:d<3600?`${Math.floor(d/60)}m ago`:`${Math.floor(d/3600)}h ago`;};

  return(
    <div style={{padding:"24px",overflowY:"auto",overflowX:"hidden",flex:1}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(0,1fr))",gap:12,marginBottom:22}}>
        {[
          {label:"Total Logs",val:stats.total_logs.toLocaleString(),sub:"all time",color:C.accent},
          {label:"Logs Today",val:stats.logs_today,sub:"since midnight",subColor:C.teal,color:C.teal},
          {label:"Open Incidents",val:stats.open_incidents,sub:`${stats.critical_incidents} critical`,subColor:C.red,color:C.red},
          {label:"Anomalies",val:stats.anomalies_detected,sub:"last 24h",color:C.amber},
          {label:"Resolved",val:stats.resolved_today,sub:"incidents closed",subColor:C.green,color:C.green},
        ].map(s=>(
          <div key={s.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"14px 16px",borderTop:`3px solid ${s.color}`}}>
            <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".07em",marginBottom:6}}>{s.label}</div>
            <div style={{fontSize:28,fontWeight:700,color:C.text,lineHeight:1}}>{s.val}</div>
            <div style={{fontSize:10,color:s.subColor||C.muted,marginTop:5}}>{s.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 280px",gap:14,marginBottom:18}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"16px"}}>
          <div style={{fontSize:11,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>Events by type</div>
          {evtData.length===0
            ?<div style={{color:C.muted,fontSize:12,padding:"20px 0",textAlign:"center"}}>No event data yet</div>
            :evtData.map((e,i)=>(
              <div key={e.event_type} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <div style={{width:6,height:6,borderRadius:2,background:colors[i],flexShrink:0}}/>
                <span style={{fontSize:11,color:C.muted,width:130,flexShrink:0}}>{e.event_type.replace(/_/g," ")}</span>
                <div style={{flex:1,background:C.border,borderRadius:2,height:4,overflow:"hidden"}}>
                  <div style={{width:`${Math.round(e.count/total*100)}%`,height:"100%",background:colors[i],borderRadius:2}}/>
                </div>
                <span style={{fontSize:11,color:C.text,fontWeight:600,minWidth:40,textAlign:"right"}}>{e.count}</span>
              </div>
            ))
          }
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,padding:"16px"}}>
          <div style={{fontSize:11,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>Breakdown</div>
          {evtData.length>0
            ?<div style={{display:"flex",alignItems:"center",gap:14}}>
              <DonutChart data={evtData}/>
              <div style={{flex:1,minWidth:0}}>
                {evtData.map((e,i)=>(
                  <div key={e.event_type} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                    <div style={{width:6,height:6,borderRadius:2,background:colors[i],flexShrink:0}}/>
                    <span style={{fontSize:10,color:C.muted,flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.event_type.replace(/_/g," ")}</span>
                    <span style={{fontSize:10,color:C.text,fontWeight:600}}>{Math.round(e.count/total*100)}%</span>
                  </div>
                ))}
              </div>
            </div>
            :<div style={{color:C.muted,fontSize:12,padding:"20px 0",textAlign:"center"}}>No data</div>
          }
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 340px",gap:14}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,overflow:"hidden"}}>
          <div style={{padding:"14px 16px 10px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span style={{fontSize:11,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:".06em"}}>Recent logs</span>
            <span style={{fontSize:10,color:C.muted}}>{logs.length} total</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"90px 1fr 110px 65px",gap:10,padding:"6px 14px",background:C.surface,borderBottom:`1px solid ${C.border}`,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em"}}>
            <span>Time</span><span>Event</span><span>IP</span><span>Severity</span>
          </div>
          {logs.length===0
            ?<div style={{padding:"24px",textAlign:"center",color:C.muted,fontSize:12}}>No logs in database yet</div>
            :logs.slice(0,7).map(l=>(
              <div key={l.log_id} style={{display:"grid",gridTemplateColumns:"90px 1fr 110px 65px",gap:10,alignItems:"center",padding:"8px 14px",borderBottom:`1px solid ${C.border}`,fontSize:11}}>
                <span style={{color:C.muted,fontFamily:"monospace",fontSize:10}}>{rel(l.event_time)}</span>
                <Badge map={SEV} val={l.event_type.replace(/_/g," ")}/>
                <span style={{color:C.text,fontFamily:"monospace",fontSize:10,overflow:"hidden",textOverflow:"ellipsis"}}>{l.ip_address}</span>
                <Badge map={SEV} val={l.severity}/>
              </div>
            ))
          }
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:9,overflow:"hidden"}}>
          <div style={{padding:"14px 16px 10px"}}>
            <span style={{fontSize:11,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:".06em"}}>Active incidents</span>
          </div>
          <div style={{display:"flex",gap:8,padding:"0 14px 10px"}}>
            {[{l:"Open",c:incidents.filter(i=>i.status==="open").length,col:C.accent},{l:"Investigating",c:incidents.filter(i=>i.status==="investigating").length,col:C.amber},{l:"Resolved",c:incidents.filter(i=>i.status==="resolved").length,col:C.green}].map(s=>(
              <div key={s.l} style={{flex:1,background:C.surface,borderRadius:6,padding:"7px 8px",border:`1px solid ${C.border}`,textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:700,color:s.col}}>{s.c}</div>
                <div style={{fontSize:9,color:C.muted,marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>
          {incidents.length===0
            ?<div style={{padding:"24px",textAlign:"center",color:C.muted,fontSize:12}}>No incidents yet</div>
            :incidents.slice(0,5).map(inc=>{
              const dt=new Date(inc.created_at);
              const fmt=`${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
              return(
                <div key={inc.incident_id} style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",borderBottom:`1px solid ${C.border}`,fontSize:11}}>
                  <span style={{fontSize:9,color:C.muted,minWidth:64,fontFamily:"monospace"}}>{fmt}</span>
                  <span style={{flex:1,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{inc.title}</span>
                  <Badge map={SEV} val={inc.severity}/>
                </div>
              );
            })
          }
        </div>
      </div>
    </div>
  );
}

function LogsPage({session}){
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [selected,setSelected]=useState(null);
  const [filters,setFilters]=useState({ip:"",username:"",event_type:"",severity:"",start_date:"",end_date:""});
  const [page,setPage]=useState(1);
  const [showAdd,setShowAdd]=useState(false);
  const [newLog,setNewLog]=useState({ip_address:"",username:"",event_type:"login_failed",severity:"low",message:""});
  const PER=8;

  const load=useCallback(async()=>{
    setLoading(true);setError(null);
    try{
      const p=new URLSearchParams();
      if(filters.ip) p.set("ip_address",filters.ip);
      if(filters.username) p.set("username",filters.username);
      if(filters.event_type) p.set("event_type",filters.event_type);
      if(filters.severity) p.set("severity",filters.severity);
      if(filters.start_date) p.set("start_date",filters.start_date);
      if(filters.end_date) p.set("end_date",filters.end_date);
      const qs=p.toString()?`?${p}`:"";
      const data=await apiFetch(`/logs${qs}`,session);
      setLogs(Array.isArray(data)?data:[]);
    }catch(e){setError(e.message);}
    setLoading(false);
  },[session,filters]);

  useEffect(()=>{load();},[load]);

  const handleDelete=async(id)=>{
    const ok=await apiDelete(`/logs/${id}`,session);
    if(ok){setLogs(p=>p.filter(l=>l.log_id!==id));if(selected?.log_id===id)setSelected(null);toast("Log archived");}
    else toast("Archive failed",C.red);
  };
  const handleAdd=async()=>{
    if(!newLog.ip_address){toast("IP address required",C.red);return;}
    const res=await apiPost("/logs",newLog,session);
    if(res?.ok){await load();setShowAdd(false);setNewLog({ip_address:"",username:"",event_type:"login_failed",severity:"low",message:""});toast("Log saved");}
    else toast("Failed to save log",C.red);
  };

  const pages=Math.max(1,Math.ceil(logs.length/PER));
  const visible=logs.slice((page-1)*PER,page*PER);

  return(
    <div style={{display:"flex",flex:1,overflow:"hidden",height:"100%"}}>
      <div style={{width:210,flexShrink:0,background:C.surface,borderRight:`1px solid ${C.border}`,padding:"18px 14px",overflowY:"auto"}}>
        <div style={{fontSize:11,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:".06em",marginBottom:14}}>Filters</div>
        {[{label:"IP Address",key:"ip",type:"text",ph:"e.g. 192.168.1.1"},{label:"Username",key:"username",type:"text",ph:"e.g. admin"},{label:"Start date",key:"start_date",type:"date"},{label:"End date",key:"end_date",type:"date"}].map(f=>(
          <div key={f.key} style={{marginBottom:12}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:4}}>{f.label}</div>
            <Input type={f.type} placeholder={f.ph} value={filters[f.key]} onChange={e=>{setFilters(p=>({...p,[f.key]:e.target.value}));setPage(1);}}/>
          </div>
        ))}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Event type</div>
          <Select value={filters.event_type} onChange={e=>{setFilters(p=>({...p,event_type:e.target.value}));setPage(1);}}>
            <option value="">All</option>
            {["login_success","login_failed","access_denied","brute_force","port_scan","data_breach","malware_detected","config_change"].map(t=><option key={t} value={t}>{t}</option>)}
          </Select>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Severity</div>
          <Select value={filters.severity} onChange={e=>{setFilters(p=>({...p,severity:e.target.value}));setPage(1);}}>
            <option value="">All</option>
            {["low","medium","high","critical"].map(s=><option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <Btn style={{width:"100%",marginBottom:8}} onClick={load}>Refresh</Btn>
        <Btn style={{width:"100%"}} onClick={()=>{setFilters({ip:"",username:"",event_type:"",severity:"",start_date:"",end_date:""});setPage(1);}}>Clear filters</Btn>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 18px",borderBottom:`1px solid ${C.border}`,background:C.surface}}>
          <div style={{fontSize:13,fontWeight:600,color:C.text}}>Log Entries<span style={{fontSize:11,color:C.muted,fontWeight:400,marginLeft:10}}>{logs.length} results</span></div>
          {session?.role==="admin"&&<Btn variant="primary" onClick={()=>setShowAdd(true)}>+ Add log</Btn>}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"60px 130px 1fr 120px 80px 80px 40px",gap:10,padding:"8px 18px",background:C.surface,borderBottom:`1px solid ${C.border}`,fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",flexShrink:0}}>
          <span>ID</span><span>Time</span><span>Event</span><span>IP</span><span>User</span><span>Severity</span><span/>
        </div>
        {loading?<Spinner/>:error?<ErrorState message={error} onRetry={load}/>:(
          <div style={{overflowY:"auto",flex:1}}>
            {visible.length===0&&<div style={{padding:"40px",textAlign:"center",color:C.muted,fontSize:13}}>No logs found</div>}
            {visible.map(l=>{
              const dt=new Date(l.event_time);
              const fmt=`${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
              return(
                <div key={l.log_id} onClick={()=>setSelected(selected?.log_id===l.log_id?null:l)}
                  style={{display:"grid",gridTemplateColumns:"60px 130px 1fr 120px 80px 80px 40px",gap:10,alignItems:"center",padding:"10px 18px",borderBottom:`1px solid ${C.border}`,fontSize:12,cursor:"pointer",background:selected?.log_id===l.log_id?C.dim:"transparent",transition:"background .15s"}}>
                  <span style={{color:C.muted,fontFamily:"monospace",fontSize:10}}>#{l.log_id}</span>
                  <span style={{color:C.muted,fontFamily:"monospace",fontSize:10}}>{fmt}</span>
                  <span style={{color:C.text}}>{l.event_type.replace(/_/g," ")}</span>
                  <span style={{color:C.text,fontFamily:"monospace",fontSize:11}}>{l.ip_address}</span>
                  <span style={{color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.username||"--"}</span>
                  <Badge map={SEV} val={l.severity}/>
                  {session?.role==="admin"&&<button onClick={e=>{e.stopPropagation();handleDelete(l.log_id);}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:14,padding:"2px 4px",borderRadius:4}}>x</button>}
                </div>
              );
            })}
          </div>
        )}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 18px",borderTop:`1px solid ${C.border}`,background:C.surface,flexShrink:0}}>
          <span style={{fontSize:11,color:C.muted}}>Page {page} of {pages}</span>
          <div style={{display:"flex",gap:6}}>
            <Btn onClick={()=>setPage(p=>Math.max(1,p-1))} style={{padding:"5px 10px"}}>Prev</Btn>
            <Btn onClick={()=>setPage(p=>Math.min(pages,p+1))} style={{padding:"5px 10px"}}>Next</Btn>
          </div>
        </div>
      </div>
      {selected&&(
        <div style={{width:300,flexShrink:0,background:C.surface,borderLeft:`1px solid ${C.border}`,overflowY:"auto",padding:"18px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <span style={{fontSize:12,fontWeight:600,color:C.text}}>Log #{selected.log_id}</span>
            <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:C.muted,fontSize:16,cursor:"pointer"}}>x</button>
          </div>
          {[{l:"Event type",v:selected.event_type},{l:"IP address",v:selected.ip_address,mono:true},{l:"Username",v:selected.username||"--"},{l:"Timestamp",v:new Date(selected.event_time).toLocaleString(),mono:true}].map(f=>(
            <div key={f.l} style={{marginBottom:12}}>
              <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>{f.l}</div>
              <div style={{fontSize:12,color:C.text,fontFamily:f.mono?"monospace":"inherit"}}>{f.v}</div>
            </div>
          ))}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>Severity</div>
            <Badge map={SEV} val={selected.severity}/>
          </div>
          {selected.message&&(
            <div>
              <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:3}}>Message</div>
              <div style={{fontSize:12,color:C.text,background:C.card,padding:"10px",borderRadius:6,border:`1px solid ${C.border}`,lineHeight:1.6}}>{selected.message}</div>
            </div>
          )}
          {session?.role==="admin"&&<div style={{marginTop:20}}><Btn variant="danger" style={{width:"100%"}} onClick={()=>handleDelete(selected.log_id)}>Archive log</Btn></div>}
        </div>
      )}
      {showAdd&&(
        <Modal title="Add log entry" onClose={()=>setShowAdd(false)}>
          {[{l:"IP Address *",key:"ip_address",ph:"e.g. 192.168.1.1"},{l:"Username",key:"username",ph:"optional"},{l:"Message",key:"message",ph:"optional details"}].map(f=>(
            <div key={f.key} style={{marginBottom:14}}>
              <div style={{fontSize:11,color:C.muted,marginBottom:5}}>{f.l}</div>
              <Input placeholder={f.ph} value={newLog[f.key]} onChange={e=>setNewLog(p=>({...p,[f.key]:e.target.value}))}/>
            </div>
          ))}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div><div style={{fontSize:11,color:C.muted,marginBottom:5}}>Event type *</div>
              <Select value={newLog.event_type} onChange={e=>setNewLog(p=>({...p,event_type:e.target.value}))} style={{width:"100%"}}>
                {["login_success","login_failed","access_denied","brute_force","port_scan","data_breach","malware_detected","config_change"].map(t=><option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div><div style={{fontSize:11,color:C.muted,marginBottom:5}}>Severity</div>
              <Select value={newLog.severity} onChange={e=>setNewLog(p=>({...p,severity:e.target.value}))} style={{width:"100%"}}>
                {["low","medium","high","critical"].map(s=><option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowAdd(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleAdd}>Add log</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function IncidentsPage({session}){
  const [incidents,setIncidents]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);
  const [selected,setSelected]=useState(null);
  const [filterStatus,setFS]=useState("");
  const [filterSev,setFSev]=useState("");
  const [filterQ,setFQ]=useState("");
  const [showCreate,setShowC]=useState(false);
  const [newInc,setNewInc]=useState({title:"",description:"",severity:"medium",status:"open"});
  const STATUSES=["open","investigating","resolved"];

  const load=useCallback(async()=>{
    setLoading(true);setError(null);
    try{const data=await apiFetch("/incidents",session);setIncidents(Array.isArray(data)?data:[]);}
    catch(e){setError(e.message);}
    setLoading(false);
  },[session]);
  useEffect(()=>{load();},[load]);

  const filtered=incidents.filter(i=>
    (!filterStatus||i.status===filterStatus)&&
    (!filterSev||i.severity===filterSev)&&
    (!filterQ||i.title.toLowerCase().includes(filterQ.toLowerCase())||(i.description||"").toLowerCase().includes(filterQ.toLowerCase()))
  );

  const updateStatus=async(id,status)=>{
    const ok=await apiPatch(`/incidents/${id}/status`,{status},session);
    if(ok){setIncidents(p=>p.map(i=>i.incident_id===id?{...i,status}:i));if(selected?.incident_id===id)setSelected(p=>({...p,status}));toast(`Status: ${status}`);}
  };
  const updateSeverity=async(id,severity)=>{
    const ok=await apiPatch(`/incidents/${id}/severity`,{severity},session);
    if(ok){setIncidents(p=>p.map(i=>i.incident_id===id?{...i,severity}:i));if(selected?.incident_id===id)setSelected(p=>({...p,severity}));toast(`Severity: ${severity}`);}
  };
  const deleteInc=async(id)=>{
    const ok=await apiDelete(`/incidents/${id}`,session);
    if(ok){setIncidents(p=>p.filter(i=>i.incident_id!==id));if(selected?.incident_id===id)setSelected(null);toast("Incident deleted",C.red);}
  };
  const createInc=async()=>{
    if(!newInc.title){toast("Title required",C.red);return;}
    const res=await apiPost("/incidents",newInc,session);
    if(res?.ok){await load();setShowC(false);setNewInc({title:"",description:"",severity:"medium",status:"open"});toast("Incident created");}
    else toast("Failed to create incident",C.red);
  };

  return(
    <div style={{display:"flex",flex:1,overflow:"hidden",height:"100%"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",borderBottom:`1px solid ${C.border}`,background:C.surface,flexShrink:0,flexWrap:"wrap"}}>
          <Input placeholder="Search..." value={filterQ} onChange={e=>setFQ(e.target.value)} style={{width:220}}/>
          <Select value={filterStatus} onChange={e=>setFS(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
          </Select>
          <Select value={filterSev} onChange={e=>setFSev(e.target.value)}>
            <option value="">All severities</option>
            {["low","medium","high","critical"].map(s=><option key={s} value={s}>{s}</option>)}
          </Select>
          <Btn onClick={load} style={{padding:"7px 10px"}}>Refresh</Btn>
          <span style={{flex:1}}/>
          <span style={{fontSize:11,color:C.muted}}>{filtered.length} incidents</span>
          {session?.role==="admin"&&<Btn variant="primary" onClick={()=>setShowC(true)}>+ New incident</Btn>}
        </div>
        {loading?<Spinner/>:error?<ErrorState message={error} onRetry={load}/>:(
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,padding:"18px",overflowY:"auto",flex:1,alignContent:"start"}}>
            {STATUSES.map(s=>{
              const cols={open:C.accent,investigating:C.amber,resolved:C.green};
              const col=cols[s];
              const items=filtered.filter(i=>i.status===s);
              return(
                <div key={s}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:col}}/>
                    <span style={{fontSize:11,fontWeight:600,color:C.text,textTransform:"uppercase",letterSpacing:".07em"}}>{s}</span>
                    <span style={{fontSize:10,color:C.muted}}>{items.length}</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {items.length===0&&<div style={{border:`1px dashed ${C.border}`,borderRadius:8,padding:"20px",textAlign:"center",color:C.muted,fontSize:11}}>No incidents</div>}
                    {items.map(inc=>{
                      const dt=new Date(inc.created_at);
                      const fmt=`${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
                      const isSel=selected?.incident_id===inc.incident_id;
                      return(
                        <div key={inc.incident_id} onClick={()=>setSelected(isSel?null:inc)}
                          style={{background:C.card,border:`1px solid ${isSel?col:C.border}`,borderRadius:8,padding:"12px 14px",cursor:"pointer",borderLeft:`3px solid ${col}`,opacity:s==="resolved"?.7:1,transition:"border-color .15s"}}>
                          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8,marginBottom:8}}>
                            <span style={{fontSize:12,fontWeight:600,color:C.text,lineHeight:1.4}}>{inc.title}</span>
                            <Badge map={SEV} val={inc.severity}/>
                          </div>
                          {inc.description&&<p style={{fontSize:11,color:C.muted,margin:"0 0 8px",lineHeight:1.5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{inc.description}</p>}
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <span style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>{fmt}</span>
                            <span style={{fontSize:10,color:C.muted}}>#{inc.incident_id}</span>
                          </div>
                          {session?.role==="admin"&&(
                            <div style={{display:"flex",gap:5,marginTop:10}} onClick={e=>e.stopPropagation()}>
                              {STATUSES.filter(st=>st!==s).map(st=>(
                                <button key={st} onClick={()=>updateStatus(inc.incident_id,st)}
                                  style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,color:C.muted,borderRadius:4,padding:"3px 0",fontSize:9,cursor:"pointer",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:".05em"}}>{st}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selected&&(
        <div style={{width:320,flexShrink:0,background:C.surface,borderLeft:`1px solid ${C.border}`,overflowY:"auto",padding:"18px 16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
            <span style={{fontSize:12,fontWeight:600,color:C.text}}>Incident #{selected.incident_id}</span>
            <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",color:C.muted,fontSize:16,cursor:"pointer"}}>x</button>
          </div>
          <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:12,lineHeight:1.4}}>{selected.title}</div>
          {selected.description&&<div style={{fontSize:12,color:C.muted,background:C.card,padding:"10px",borderRadius:6,border:`1px solid ${C.border}`,lineHeight:1.6,marginBottom:16}}>{selected.description}</div>}
          {session?.role==="admin"&&(
            <>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Severity</div>
                <div style={{display:"flex",gap:6}}>
                  {["low","medium","high","critical"].map(sv=>(
                    <button key={sv} onClick={()=>updateSeverity(selected.incident_id,sv)}
                      style={{flex:1,padding:"5px 0",borderRadius:5,fontSize:10,cursor:"pointer",fontFamily:"inherit",textTransform:"uppercase",letterSpacing:".05em",background:selected.severity===sv?SEV[sv].bg:C.card,color:selected.severity===sv?SEV[sv].text:C.muted,border:`1px solid ${selected.severity===sv?SEV[sv].border:C.border}`}}>
                      {sv}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>Status</div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {STATUSES.map(st=>(
                    <button key={st} onClick={()=>updateStatus(selected.incident_id,st)}
                      style={{padding:"8px 12px",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"inherit",textAlign:"left",background:selected.status===st?STA[st].bg:C.card,color:selected.status===st?STA[st].text:C.muted,border:`1px solid ${selected.status===st?STA[st].border:C.border}`,fontWeight:selected.status===st?600:400}}>
                      {selected.status===st?"● ":"○ "}{st.charAt(0).toUpperCase()+st.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div style={{fontSize:10,color:C.muted,marginBottom:4}}>Created</div>
          <div style={{fontSize:11,color:C.text,fontFamily:"monospace",marginBottom:16}}>{new Date(selected.created_at).toLocaleString()}</div>
          {session?.role==="admin"&&<Btn variant="danger" style={{width:"100%"}} onClick={()=>deleteInc(selected.incident_id)}>Delete incident</Btn>}
        </div>
      )}
      {showCreate&&(
        <Modal title="New incident" onClose={()=>setShowC(false)}>
          <div style={{marginBottom:14}}><div style={{fontSize:11,color:C.muted,marginBottom:5}}>Title *</div><Input placeholder="Brief incident title" value={newInc.title} onChange={e=>setNewInc(p=>({...p,title:e.target.value}))}/></div>
          <div style={{marginBottom:14}}><div style={{fontSize:11,color:C.muted,marginBottom:5}}>Description</div><textarea value={newInc.description} onChange={e=>setNewInc(p=>({...p,description:e.target.value}))} placeholder="Describe what happened..." style={{background:C.surface,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"8px 12px",fontSize:12,fontFamily:"inherit",outline:"none",width:"100%",minHeight:80,resize:"vertical"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            <div><div style={{fontSize:11,color:C.muted,marginBottom:5}}>Severity</div><Select value={newInc.severity} onChange={e=>setNewInc(p=>({...p,severity:e.target.value}))} style={{width:"100%"}}>{["low","medium","high","critical"].map(s=><option key={s} value={s}>{s}</option>)}</Select></div>
            <div><div style={{fontSize:11,color:C.muted,marginBottom:5}}>Initial status</div><Select value={newInc.status} onChange={e=>setNewInc(p=>({...p,status:e.target.value}))} style={{width:"100%"}}>{STATUSES.map(s=><option key={s} value={s}>{s}</option>)}</Select></div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <Btn onClick={()=>setShowC(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={createInc}>Create</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function App(){
  const [page,setPage]=useState("dashboard");
  const [health,setHealth]=useState(null);
  const [session,setSession]=useState(null);
  const [settings,setSettings]=useState(DEFAULT_SETTINGS);

  const checkHealth=useCallback(async()=>{
    try{const r=await fetch(`${API_BASE}/health`,{headers:makeHeaders(session)});setHealth(r.ok?"ok":"error");}
    catch{setHealth("error");}
  },[session]);

  useEffect(()=>{checkHealth();const id=setInterval(checkHealth,30000);return()=>clearInterval(id);},[checkHealth]);

  if(!session) return <LoginPage onLogin={setSession}/>;

  return(
    <div style={{display:"flex",height:"100vh",width:"100vw",overflow:"hidden",background:C.bg,fontFamily:"'IBM Plex Mono','JetBrains Mono','Courier New',monospace"}}>
      <Sidebar page={page} setPage={setPage} health={health} session={session}/>
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {page==="dashboard"  && <DashboardPage  session={session}/>}
        {page==="logs"       && <LogsPage       session={session}/>}
        {page==="incidents"  && <IncidentsPage  session={session}/>}
        {page==="anomalies"  && <AnomaliesPage  session={session}/>}
        {page==="reports"    && <ReportsPage    session={session}/>}
        {page==="settings"   && <SettingsPage   settings={settings} onSave={setSettings} session={session} onLogout={()=>setSession(null)}/>}
      </div>
      <AlertSystem session={session} settings={settings}/>
    </div>
  );
}
