/**
 * app.js — Visor bivariado NACIONAL SERPAVI × ADRH (España).
 * Selector CCAA → provincia (carga GeoJSON bajo demanda), Leaflet en canvas
 * para muchas secciones, Plotly para la dispersión y leyenda bivariada clicable.
 */

const BIV_COLORS = {
  "1-1": "#e8e8e8", "2-1": "#ace4e4", "3-1": "#5ac8c8",
  "1-2": "#dfb0d6", "2-2": "#a5b3cc", "3-2": "#5698b9",
  "1-3": "#be64ac", "2-3": "#8c62aa", "3-3": "#3b4994",
};
const CLASSES = ["1-1", "2-1", "3-1", "1-2", "2-2", "3-2", "1-3", "2-3", "3-3"];
const GRIS_NA = "#cccccc";
const TERCIL_LBL = { 1: "bajo", 2: "medio", 3: "alto" };

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_OPT = {
  attribution: '&copy; <a href="https://carto.com/">CartoDB</a> &copy; ' +
               '<a href="https://www.openstreetmap.org/copyright">OSM</a>',
  maxZoom: 19,
};

let map, layer, legendEl, lastBounds = null;
let activeClass = null;
let scatterDrawn = false;
const cache = {};
let meta = null;
let provById = {};

init();

async function init() {
  map = L.map("map", { zoomControl: true, preferCanvas: true });
  L.tileLayer(TILE_URL, TILE_OPT).addTo(map);

  meta = await (await fetch("data/meta.json")).json();
  document.getElementById("breaks-note").innerHTML =
    `Cortes (terciles España): alquiler ${meta.breaks.alquiler[0]} / ${meta.breaks.alquiler[1]} €/m²·mes · ` +
    `renta ${fmtEur(meta.breaks.renta[0])} / ${fmtEur(meta.breaks.renta[1])} €.`;

  buildSelect(meta.provinces);
  addLegend();
  setupTabs();

  const sel = document.getElementById("area-select");
  sel.addEventListener("change", () => loadProv(sel.value));
  await loadProv(sel.value);
}

// ── Selector CCAA → provincia ────────────────────────────────────────────────
function buildSelect(provs) {
  provs.forEach((p) => (provById[p.code] = p));
  const byCcaa = {};
  for (const p of provs) (byCcaa[p.ccaa] ||= []).push(p);
  const sel = document.getElementById("area-select");
  const order = Object.keys(byCcaa).sort((a, b) => a.localeCompare(b, "es"));
  let html = "";
  for (const ccaa of order) {
    html += `<optgroup label="${ccaa}">`;
    byCcaa[ccaa].sort((a, b) => a.name.localeCompare(b.name, "es"));
    for (const p of byCcaa[ccaa]) html += `<option value="${p.code}">${p.name}</option>`;
    html += `</optgroup>`;
  }
  sel.innerHTML = html;
  sel.value = "28"; // Madrid por defecto
}

// ── Carga de provincia ───────────────────────────────────────────────────────
async function loadProv(code) {
  if (!cache[code]) cache[code] = await (await fetch(`data/${code}.geojson`)).json();
  const feats = cache[code].features;
  activeClass = null;

  if (layer) { map.removeLayer(layer); layer = null; }
  layer = L.geoJSON(cache[code], {
    style: (f) => ({ fillColor: f.properties.fill_col || GRIS_NA, fillOpacity: 0.85, color: "#fff", weight: 0.25 }),
    onEachFeature: bindTip,
  }).addTo(map);

  lastBounds = layer.getBounds().pad(0.05);
  const fit = () => { map.invalidateSize(false); map.fitBounds(lastBounds); };
  fit(); requestAnimationFrame(fit); setTimeout(fit, 200);

  renderScatter(feats);
  updateInfo(code, feats);
  applyFilter();
}

function bindTip(f, lyr) {
  const p = f.properties;
  const muni = (p.municipio || "").replace(/^\d+\s*/, "");
  let body;
  if (p.bi_class) {
    body =
      `<b>${muni}</b><br>` +
      `Alquiler: <b>${p.alquiler}</b> €/m²·mes <span class="tip-muted">(${TERCIL_LBL[p.ca]})</span><br>` +
      `Renta/persona: <b>${fmtEur(p.renta_eur)}</b> € <span class="tip-muted">(${TERCIL_LBL[p.cr]})</span><br>` +
      `<span class="tip-muted">Clase ${p.bi_class} · sec. ${p.cusec}</span>`;
  } else {
    body =
      `<b>${muni}</b><br>` +
      `<span class="tip-muted">Sin dato de alquiler (supresión SERPAVI)</span><br>` +
      (p.renta_eur ? `Renta/persona: <b>${fmtEur(p.renta_eur)}</b> €<br>` : "") +
      `<span class="tip-muted">sec. ${p.cusec}</span>`;
  }
  lyr.bindTooltip(body, { sticky: true, className: "secc-tip" });
}

// ── Dispersión (Plotly) ──────────────────────────────────────────────────────
function renderScatter(features) {
  const byClass = {};
  CLASSES.forEach((c) => (byClass[c] = { x: [], y: [], text: [] }));
  for (const f of features) {
    const p = f.properties;
    if (!p.bi_class) continue;
    const g = byClass[p.bi_class];
    g.x.push(p.alquiler); g.y.push(p.renta_eur);
    g.text.push((p.municipio || "").replace(/^\d+\s*/, ""));
  }
  const traces = CLASSES.map((c) => ({
    type: "scattergl", mode: "markers", name: c,
    x: byClass[c].x, y: byClass[c].y, text: byClass[c].text,
    marker: { color: BIV_COLORS[c], size: 7, opacity: 0.8, line: { width: 0.4, color: "#fff" } },
    hovertemplate: "<b>%{text}</b><br>Alquiler: %{x} €/m²·mes<br>Renta: %{y:,} €<br>Clase " + c + "<extra></extra>",
  }));
  const ba = meta.breaks.alquiler, br = meta.breaks.renta;
  const ln = (o) => Object.assign({ type: "line", line: { color: "#999", width: 1, dash: "dot" } }, o);
  const shapes = [
    ...ba.map((v) => ln({ x0: v, x1: v, yref: "paper", y0: 0, y1: 1 })),
    ...br.map((v) => ln({ y0: v, y1: v, xref: "paper", x0: 0, x1: 1 })),
  ];
  const layout = {
    margin: { l: 64, r: 16, t: 16, b: 48 },
    xaxis: { title: "Alquiler (€/m²·mes)", zeroline: false },
    yaxis: { title: "Renta neta por persona (€)", zeroline: false },
    shapes, showlegend: false, font: { family: "Inter, sans-serif", size: 12 },
    plot_bgcolor: "#fff", paper_bgcolor: "#fff",
  };
  Plotly.react("plot-scatter", traces, layout, { displayModeBar: false, responsive: true });
  scatterDrawn = true;
}

// ── Filtro por clase ─────────────────────────────────────────────────────────
function applyFilter() {
  if (layer) layer.eachLayer((sub) => {
    const cls = sub.feature.properties.bi_class;
    sub.setStyle({ fillOpacity: activeClass === null || cls === activeClass ? 0.85 : 0.1 });
  });
  if (scatterDrawn) {
    const op = CLASSES.map((c) => (activeClass === null || c === activeClass ? 0.8 : 0.08));
    Plotly.restyle("plot-scatter", { "marker.opacity": op });
  }
  syncLegend();
}

// ── Leyenda bivariada ────────────────────────────────────────────────────────
function addLegend() {
  const ctrl = L.control({ position: "bottomright" });
  ctrl.onAdd = () => {
    const div = L.DomUtil.create("div", "biv-legend-control");
    let cells = "";
    for (let y = 3; y >= 1; y--)
      for (let x = 1; x <= 3; x++) {
        const cls = `${x}-${y}`;
        cells += `<div class="biv-cell" data-cls="${cls}" title="alquiler ${TERCIL_LBL[x]} · renta ${TERCIL_LBL[y]}" style="background:${BIV_COLORS[cls]}"></div>`;
      }
    div.innerHTML =
      `<div class="biv-legend-title">Alquiler × renta</div>` +
      `<div class="biv-grid-wrap"><div class="biv-yaxis">Mayor renta →</div>` +
      `<div class="biv-grid">${cells}</div></div>` +
      `<div class="biv-xaxis">Mayor alquiler →</div>` +
      `<button class="biv-reset" type="button">limpiar selección</button>`;
    L.DomEvent.disableClickPropagation(div);
    div.querySelectorAll(".biv-cell").forEach((c) =>
      c.addEventListener("click", () => { activeClass = activeClass === c.dataset.cls ? null : c.dataset.cls; applyFilter(); }));
    div.querySelector(".biv-reset").addEventListener("click", () => { activeClass = null; applyFilter(); });
    legendEl = div;
    return div;
  };
  ctrl.addTo(map);
}

function syncLegend() {
  if (!legendEl) return;
  legendEl.querySelectorAll(".biv-cell").forEach((c) => {
    c.classList.toggle("active", activeClass === c.dataset.cls);
    c.classList.toggle("dimmed", activeClass !== null && activeClass !== c.dataset.cls);
  });
}

// ── Pestañas ─────────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      const tab = btn.dataset.tab;
      document.getElementById(`panel-${tab}`).classList.add("active");
      if (tab === "map") setTimeout(() => { map.invalidateSize(false); if (lastBounds) map.fitBounds(lastBounds); }, 60);
      if (tab === "scatter") setTimeout(() => Plotly.Plots.resize("plot-scatter"), 60);
    });
  });
}

// ── Panel de info ────────────────────────────────────────────────────────────
function updateInfo(code, feats) {
  const p = provById[code] || { name: code, ccaa: "" };
  const conClase = feats.filter((f) => f.properties.bi_class);
  const alqs = conClase.map((f) => f.properties.alquiler).filter((v) => v != null);
  const rens = feats.map((f) => f.properties.renta_eur).filter((v) => v != null);
  const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const sub = p.ccaa && p.ccaa !== p.name ? `<div class="area-ccaa">${p.ccaa}</div>` : "";
  document.getElementById("area-info").innerHTML =
    `<h3>${p.name}</h3>${sub}` +
    `<div class="metric"><span>Secciones</span><b>${feats.length}</b></div>` +
    `<div class="metric"><span>Con alquiler</span><b>${conClase.length}</b></div>` +
    `<div class="metric"><span>Sin dato (gris)</span><b>${feats.length - conClase.length}</b></div>` +
    `<div class="metric"><span>Alquiler mediano</span><b>${med(alqs) ?? "—"} €/m²·mes</b></div>` +
    `<div class="metric"><span>Renta mediana</span><b>${fmtEur(med(rens))} €</b></div>`;
}

function fmtEur(v) { return v == null ? "—" : v.toLocaleString("es-ES"); }
