const $ = id => document.getElementById(id);
let state = { buses: [], routes: [], stops: [], traffic: [] };
let map, busMarkers = {}, routeLayers = [];

function statusClass(status) {
  return status === "On time" ? "ok" : status === "Heavy traffic" ? "bad" : "warn";
}
function routeFor(id) { return state.routes.find(r => r.id === id); }
function renderStats() {
  $("active-count").textContent = String(state.buses.length).padStart(2,"0");
  $("route-count").textContent = String(state.routes.length).padStart(2,"0");
  const avg = state.buses.length ? Math.round(state.buses.reduce((a,b)=>a+b.speed,0)/state.buses.length) : 0;
  $("avg-speed").innerHTML = `${avg} <small>km/h</small>`;
  $("alert-count").textContent = String(state.traffic.filter(t=>t.score>=70).length).padStart(2,"0");
}
function renderBuses() {
  $("bus-table").innerHTML = state.buses.map(b => {
    const r = routeFor(b.routeId);
    return `<tr><td>${b.id}</td><td>${r?.number || b.routeId}</td><td>${Math.round(b.speed)} km/h</td><td>${b.occupancy}%</td><td><span class="status ${statusClass(b.status)}">${b.status}</span></td></tr>`;
  }).join("");
  $("last-updated").textContent = "Updated " + new Date().toLocaleTimeString();
}
function renderTraffic() {
  $("traffic-list").innerHTML = state.traffic.map(t => `<div><div class="traffic-row-top"><span>${t.area}</span><span class="${t.level.toLowerCase()}">${t.level} · ${t.score}%</span></div><div class="bar"><i style="width:${t.score}%;background:${t.score>=70?'#e47769':t.score>=45?'#e4ae52':'#32b58a'}"></i></div></div>`).join("");
  $("traffic-summary").innerHTML = [
    ["Corridors monitored",state.traffic.length],["Heavy congestion",state.traffic.filter(t=>t.score>=70).length],["Network status",state.traffic.filter(t=>t.score<45).length?"Mixed":"Busy"]
  ].map(x=>`<div class="summary-box"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("");
  $("traffic-detail").innerHTML = state.traffic.map(t=>`<div class="detail-row"><b>${t.area}</b><div class="bar"><i style="width:${t.score}%;background:${t.score>=70?'#e47769':t.score>=45?'#e4ae52':'#32b58a'}"></i></div><b>${t.score}</b></div>`).join("");
}
function initMap() {
  if (map || !window.L) return;
  map = L.map("map", { zoomControl:true }).setView([28.625,77.245],12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap contributors",maxZoom:19}).addTo(map);
  state.routes.forEach(r=>{
    const points = r.stopIds.map(id=>state.stops.find(s=>s.id===id)).filter(Boolean).map(s=>[s.lat,s.lng]);
    const layer = L.polyline(points,{color:r.color,weight:4,opacity:.55}).addTo(map);
    routeLayers.push(layer);
  });
  state.stops.forEach(s=>L.circleMarker([s.lat,s.lng],{radius:4,color:"#0d9488",fillColor:"#fff",fillOpacity:1,weight:2}).addTo(map).bindPopup(`<b>${s.name}</b><br>Demo bus stop`));
  map.invalidateSize();
}
function updateMap() {
  if (!map) return;
  state.buses.forEach(b=>{
    const r=routeFor(b.routeId);
    const label = `<b>${b.id}</b><br>${r?.name || b.routeId}<br>${Math.round(b.speed)} km/h · ${b.status}<br>Occupancy: ${b.occupancy}%`;
    if (!busMarkers[b.id]) busMarkers[b.id]=L.circleMarker([b.lat,b.lng],{radius:8,color:"#fff",weight:2,fillColor:r?.color||"#315de8",fillOpacity:1}).addTo(map);
    busMarkers[b.id].setLatLng([b.lat,b.lng]).bindPopup(label);
  });
}
function fillStops() {
  const opts=state.stops.map(s=>`<option value="${s.id}">${s.name}</option>`).join("");
  $("from-stop").innerHTML=opts; $("to-stop").innerHTML=opts;
  $("from-stop").value="S1"; $("to-stop").value="S5";
}
function renderAll() { renderStats();renderBuses();renderTraffic();initMap();updateMap(); }
async function load() {
  try { const r=await fetch("/api/dashboard"); if(!r.ok) throw Error("API unavailable"); state=await r.json(); renderAll();fillStops(); }
  catch(e) { console.error(e); $("last-updated").textContent="Could not connect to API"; }
}
function connectLive() {
  if (!window.io) return;
  const socket=io();
  socket.on("bus:update",data=>{state=data;renderStats();renderBuses();renderTraffic();updateMap();});
}
async function searchJourney() {
  const from=$("from-stop").value,to=$("to-stop").value;
  const button=$("search-journey");button.disabled=true;button.textContent="Finding routes…";
  try {
    const res=await fetch("/api/journey/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({from,to})});
    const data=await res.json(); if(!res.ok) throw Error(data.error);
    $("results-caption").textContent=`${data.from.name} → ${data.to.name}`;
    $("journey-results").className="";
    $("journey-results").innerHTML=(data.note?`<p class="subtext">${data.note}</p>`:"")+data.options.map((o,i)=>`
      <article class="journey-option ${i===0?'best':''}">
        <div class="option-top"><div><div class="route-number">${o.route.number} · ${o.route.name}</div><div class="option-meta"><span>${o.transfers} transfers</span><span>${o.occupancy}% occupancy estimate</span></div></div>
        <div style="text-align:right"><div class="option-time">${o.minutes} min</div>${i===0?'<span class="recommend">RECOMMENDED</span>':''}</div></div>
        <div class="option-meta"><span>● ${data.from.name}</span><span>→</span><span>◎ ${data.to.name}</span></div>
      </article>`).join("");
  } catch(e) { $("journey-results").innerHTML=`<div class="empty-state"><b>Could not find journeys</b><p>${e.message}</p></div>`; }
  finally {button.disabled=false;button.innerHTML='Find journeys <span>→</span>';}
}
function showView(name) {
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  $(`${name}-view`).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $("page-title").textContent={overview:"Network overview",journey:"Journey planner",traffic:"Traffic insights"}[name];
  if(name==="overview" && map) setTimeout(()=>map.invalidateSize(),100);
}
document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.view)));
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>showView(b.dataset.open)));
$("plan-now").addEventListener("click",()=>showView("journey"));
$("search-journey").addEventListener("click",searchJourney);
$("swap-stops").addEventListener("click",()=>{const a=$("from-stop").value;$("from-stop").value=$("to-stop").value;$("to-stop").value=a;});
load().then(connectLive);
