# Visor bivariado SERPAVI × ADRH — España

Visor web interactivo (Leaflet + Plotly) de la coropleta bivariada **alquiler
(SERPAVI 2024) × renta neta por persona (ADRH/INE 2021)** a nivel de **sección
censal** para **toda España**, clasificada por **terciles nacionales**.
Versión nacional de [bivariate-rent-income](https://preenvirons.github.io/bivariate-rent-income/)
(Balears y Canarias).

## Funciones
- **Selector CCAA → provincia** (52 provincias); cada provincia se carga bajo
  demanda (GeoJSON propio) para no descargar todo de golpe.
- Mapa Leaflet en **canvas** (fluido con miles de secciones, p. ej. Madrid 4.400+).
- **Dispersión** (Plotly): alquiler × renta por sección, color por clase
  bivariada y líneas de los terciles nacionales.
- Leyenda bivariada **clicable**: resalta un grupo en mapa y dispersión a la vez.
- Tooltip por sección y panel con conteos y medianas de la provincia.

## Datos
Terciles nacionales (España): alquiler **6,15 / 8,84 €/m²·mes** · renta
**13.117 / 16.948 €**. ~26.100 secciones clasificables; el gris (≈28 %) es
sin dato de alquiler (supresión SERPAVI, frecuente en zonas rurales).

## Estructura
```
bivariate-rent-income-spain/
├── index.html
├── css/style.css
├── js/app.js
└── data/
    ├── 01.geojson … 52.geojson   # una provincia por código INE (WGS84)
    └── meta.json                 # cortes + listado de provincias (código, nombre, CCAA)
```
Los GeoJSON se generan desde el proyecto de análisis con
`SERPAVI_ADRH/export_geojson_spain.R`.

## Ejecutar en local
```bash
python3 -m http.server 8766   # desde esta carpeta
# abrir http://localhost:8766
```

## Desplegar (GitHub Pages, org PreEnvirons)
Ver `GITHUB_SETUP.md`. URL: `https://preenvirons.github.io/bivariate-rent-income-spain/`

Fuentes: SERPAVI (MIVAU) y Atlas de Distribución de Renta de los Hogares (INE) · CC BY 4.0
