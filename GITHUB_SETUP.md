# GitHub Setup — `bivariate-rent-income-spain`

Visor bivariado nacional (alquiler × renta) en GitHub Pages, org **PreEnvirons**.

```bash
cd ~/Cowork_Links/"Articulo 1 GRATET"/ISBNPA_2026/bivariate-rent-income-spain

git init
git add .
git commit -m "Initial commit: national bivariate rent × income viewer (52 provinces)"

gh repo create PreEnvirons/bivariate-rent-income-spain \
  --public \
  --description "Coropleta bivariada: alquiler (SERPAVI 2024) × renta neta por persona (ADRH 2021) · secciones censales · toda España" \
  --source=. --remote=origin --push

gh api repos/PreEnvirons/bivariate-rent-income-spain/pages \
  --method POST --field 'source[branch]=main' --field 'source[path]=/'
```

URL: **https://preenvirons.github.io/bivariate-rent-income-spain/**

Actualizaciones: regenerar datos con `SERPAVI_ADRH/export_geojson_spain.R`, luego `git add . && git commit && git push`.
