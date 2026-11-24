const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const stops = [
  { id: "S1", name: "Kashmere Gate", lat: 28.6675, lng: 77.2282 },
  { id: "S2", name: "Red Fort", lat: 28.6562, lng: 77.2410 },
  { id: "S3", name: "ITO", lat: 28.6289, lng: 77.2405 },
  { id: "S4", name: "India Gate", lat: 28.6129, lng: 77.2295 },
  { id: "S5", name: "AIIMS", lat: 28.5672, lng: 77.2100 },
  { id: "S6", name: "Hauz Khas", lat: 28.5494, lng: 77.2001 },
  { id: "S7", name: "Anand Vihar", lat: 28.6469, lng: 77.3160 },
  { id: "S8", name: "Connaught Place", lat: 28.6315, lng: 77.2167 },
  { id: "S9", name: "New Delhi Railway Station", lat: 28.6430, lng: 77.2197 },
  { id: "S10", name: "Lajpat Nagar", lat: 28.5677, lng: 77.2433 }
];

const routes = [
  { id: "R101", name: "North–Central Connector", number: "DL 1PC 101", stopIds: ["S1","S2","S3","S4","S8"], color: "#2563eb", baseMinutes: 32 },
  { id: "R205", name: "Central–South Express", number: "DL 1PC 205", stopIds: ["S9","S8","S4","S5","S6"], color: "#0d9488", baseMinutes: 38 },
  { id: "R310", name: "East–Central Link", number: "DL 1PC 310", stopIds: ["S7","S3","S8","S9"], color: "#d97706", baseMinutes: 29 },
  { id: "R412", name: "South–East Connector", number: "DL 1PC 412", stopIds: ["S6","S5","S10","S3","S7"], color: "#9333ea", baseMinutes: 44 }
];

const buses = [
  { id: "B101", routeId: "R101", lat: 28.6600, lng: 77.2350, progress: 0.25, speed: 24, occupancy: 42, status: "On time", delay: 0 },
  { id: "B102", routeId: "R101", lat: 28.6370, lng: 77.2320, progress: 0.68, speed: 17, occupancy: 78, status: "Moderate delay", delay: 5 },
  { id: "B205", routeId: "R205", lat: 28.6010, lng: 77.2250, progress: 0.53, speed: 20, occupancy: 55, status: "On time", delay: 0 },
  { id: "B310", routeId: "R310", lat: 28.6390, lng: 77.2800, progress: 0.38, speed: 12, occupancy: 86, status: "Heavy traffic", delay: 9 },
  { id: "B412", routeId: "R412", lat: 28.5580, lng: 77.2180, progress: 0.19, speed: 22, occupancy: 31, status: "On time", delay: 0 }
];

const traffic = [
  { area: "Central Delhi", level: "Moderate", score: 58, trend: "+4%" },
  { area: "ITO Corridor", level: "Heavy", score: 84, trend: "+12%" },
  { area: "South Delhi", level: "Smooth", score: 28, trend: "-6%" },
  { area: "East Delhi", level: "Heavy", score: 79, trend: "+8%" }
];

function snapshot() {
  return { buses, routes, stops, traffic, updatedAt: new Date().toISOString() };
}
app.get("/api/health", (_, res) => res.json({ ok: true, service: "SmartMove API" }));
app.get("/api/dashboard", (_, res) => res.json(snapshot()));
app.get("/api/buses", (_, res) => res.json(buses));
app.get("/api/routes", (_, res) => res.json(routes));
app.get("/api/stops", (_, res) => res.json(stops));
app.get("/api/traffic", (_, res) => res.json(traffic));

app.post("/api/journey/search", (req, res) => {
  const { from, to } = req.body || {};
  if (!from || !to || from === to) return res.status(400).json({ error: "Choose two different stops." });
  const start = stops.find(s => s.id === from);
  const end = stops.find(s => s.id === to);
  if (!start || !end) return res.status(404).json({ error: "Stop not found." });

  const options = routes.filter(r => r.stopIds.includes(from) && r.stopIds.includes(to))
    .map(r => {
      const bus = buses.find(b => b.routeId === r.id);
      const trafficFactor = bus && bus.speed < 15 ? 1.28 : 1;
      const minutes = Math.round(r.baseMinutes * trafficFactor + (bus?.delay || 0));
      return { route: r, bus: bus || null, minutes, transfers: 0, occupancy: bus?.occupancy ?? 0 };
    });

  if (!options.length) {
    const alternative = routes.slice(0, 2).map((r, i) => ({
      route: r, bus: buses.find(b => b.routeId === r.id) || null,
      minutes: r.baseMinutes + 12 + i * 5, transfers: 1, occupancy: 50 + i * 10
    }));
    return res.json({ from: start, to: end, options: alternative, note: "No direct route in this demo dataset. Showing sample connecting options." });
  }
  options.sort((a,b) => a.minutes - b.minutes);
  res.json({ from: start, to: end, options, note: "Estimated from demo route and traffic data." });
});

io.on("connection", socket => {
  socket.emit("bus:update", snapshot());
});

setInterval(() => {
  buses.forEach(bus => {
    const route = routes.find(r => r.id === bus.routeId);
    const index = Math.floor(bus.progress * (route.stopIds.length - 1));
    const nextIndex = Math.min(index + 1, route.stopIds.length - 1);
    const a = stops.find(s => s.id === route.stopIds[index]);
    const b = stops.find(s => s.id === route.stopIds[nextIndex]);
    bus.progress += 0.004 + bus.speed / 15000;
    if (bus.progress >= 0.98) bus.progress = 0.03;
    const t = Math.min(1, (bus.progress * (route.stopIds.length - 1)) - index);
    bus.lat = a.lat + (b.lat - a.lat) * t;
    bus.lng = a.lng + (b.lng - a.lng) * t;
    bus.speed = Math.max(8, Math.min(34, bus.speed + (Math.random() - 0.5) * 3));
    bus.occupancy = Math.max(15, Math.min(98, Math.round(bus.occupancy + (Math.random() - 0.5) * 5)));
    bus.status = bus.speed < 14 ? "Heavy traffic" : bus.delay > 0 ? "Moderate delay" : "On time";
  });
  const data = snapshot();
  io.emit("bus:update", data);
}, 3000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`SmartMove running at http://localhost:${PORT}`));
