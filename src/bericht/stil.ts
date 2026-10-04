/**
 * Der Bericht bringt sein CSS als Text mit, damit die Exportdatei ohne die App
 * auskommt. Farben und Schriften kommen ausschließlich aus den Design-Tokens
 * (`src/design/tokens.css`): in der App liegen sie schon global, die
 * Exportdatei bettet sie zusammen mit den Schriften ein.
 */
export const BERICHT_CSS = `
.bericht { background: var(--grund); color: var(--schrift); font: 15px/1.45 var(--familie-text); max-width: 60rem; margin: 0 auto; padding: 1rem 1.25rem 2rem; }
.bericht h1, .bericht h2, .bericht h3, .bericht .kopf .endstand, .bericht .spielerin .nr, .bericht .werte dd { font-family: var(--familie-zahl); }
.bericht header { padding-bottom: 1rem; border-bottom: 2px solid var(--schrift); }
.bericht .titelzeile { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 1rem; }
.bericht .titelzeile .logo { font-size: 12px; }
.bericht h1 { font-size: 2rem; line-height: 1.05; font-weight: 700; margin: 0 0 .25rem; }
.bericht h2 { font-size: 1.05rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--gedaempft); margin: 2rem 0 .6rem; padding-bottom: .3rem; border-bottom: 2px dashed var(--rand); }
.bericht h3 { font-size: 1.15rem; font-weight: 700; margin: 0; display: flex; align-items: baseline; gap: .5rem; }
.bericht .kopf { display: flex; flex-wrap: wrap; align-items: baseline; gap: 1rem 2rem; }
.bericht .kopf .endstand { font-size: 3.2rem; line-height: 1; font-weight: 700; font-variant-numeric: tabular-nums; }
.bericht .kopf .halbzeit, .bericht .kopf .datum { color: var(--gedaempft); }
.bericht .pruefung summary { cursor: pointer; color: var(--gedaempft); }
.bericht .pruefung.auffaellig summary { color: var(--schlecht); }
.bericht .pruefung ul { margin: .25rem 0; padding-left: 1.25rem; font-size: .9rem; }
.bericht table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
.bericht th, .bericht td { text-align: left; padding: .3rem .5rem; border-bottom: 1px solid var(--rand); }
.bericht th.zahl, .bericht td.zahl { text-align: right; }
.bericht thead th { color: var(--gedaempft); font-weight: 600; font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; }
.bericht .hinweis { color: var(--gedaempft); font-size: .9rem; }
.bericht .diagramm { display: block; margin: .5rem 0; }
.bericht .spielerin { background: var(--flaeche); border: 1px solid var(--rand); border-radius: var(--radius); padding: .75rem 1rem; margin: .75rem 0; }
.bericht .spielerin .nr { font-size: 1.8rem; font-weight: 700; min-width: 2.2rem; }
.bericht .spielerin .rolle { color: var(--gedaempft); font-family: var(--familie-text); font-size: .85rem; font-weight: 400; }
.bericht .werte { display: flex; flex-wrap: wrap; gap: .25rem 1.5rem; margin: .5rem 0 0; }
.bericht .werte div { display: flex; gap: .4rem; align-items: baseline; }
.bericht .werte dt { color: var(--gedaempft); font-size: .85rem; }
.bericht .werte dd { margin: 0; font-size: 1.1rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.bericht .werte small { font-weight: 400; color: var(--gedaempft); }
.bericht .zaehler { margin: .35rem 0 0; color: var(--gedaempft); font-size: .9rem; }
.bericht .plusminus.plus { color: var(--gut); }
.bericht .plusminus.minus { color: var(--schlecht); }
.bericht .spielerin details { margin-top: .5rem; }
.bericht .spielerin summary { cursor: pointer; color: var(--gedaempft); }
.bericht .spielerin details table { font-size: .9rem; margin-top: .25rem; }
.bericht .warnung { color: var(--schlecht); }
.bericht .fuss { margin-top: 3rem; color: var(--gedaempft); font-size: .85rem; }
.bericht .schlaglichter { margin: .5rem 0; padding-left: 1.25rem; }
.bericht .schlaglichter li { margin: .15rem 0; }

.bericht .vk-raster { stroke: var(--rand); stroke-width: 1; }
.bericht .vk-null { stroke: var(--gedaempft); stroke-width: 1.5; }
.bericht .vk-linie { fill: none; stroke: var(--schrift); stroke-width: 2.5; stroke-linejoin: round; }
.bericht .vk-plus { fill: var(--gut-flaeche); }
.bericht .vk-minus { fill: var(--schlecht-flaeche); }
.bericht .vk-achse-text { fill: var(--gedaempft); font-size: 12px; }
.bericht .vk-halbzeit line { stroke: var(--gedaempft); stroke-dasharray: 4 4; }
.bericht .vk-halbzeit text { fill: var(--gedaempft); font-size: 12px; }
.bericht .vk-auszeit { fill: var(--akzent); }
.bericht .vk-strafe { stroke: var(--schlecht); stroke-width: 3; }
.bericht .pb-grund { stroke: var(--gedaempft); }
.bericht .pb-tore { fill: var(--gut); }
.bericht .pb-gegentore { fill: var(--schlecht); }
.bericht .pb-wert { fill: var(--schrift); font-size: 12px; }
.bericht .pb-achse-text { fill: var(--gedaempft); font-size: 12px; }
.bericht .el-grund { fill: var(--rand); }
.bericht .el-feld { fill: var(--feld); }
.bericht .el-strafe { fill: var(--schlecht); }
.bericht .el-tor { fill: var(--akzent); }
.bericht .el-halbzeit { stroke: var(--gedaempft); stroke-dasharray: 3 3; }
.bericht .wurfbild { max-width: 36rem; }
.bericht .wb-feld { fill: var(--flaeche); stroke: var(--rand); stroke-width: 2; }
.bericht .wb-tor { fill: none; stroke: var(--gedaempft); stroke-width: 3; }
.bericht .wb-torraum { fill: var(--rand); fill-opacity: .35; stroke: var(--gedaempft); stroke-width: 2; }
.bericht .wb-freiwurf { fill: none; stroke: var(--gedaempft); stroke-width: 2; stroke-dasharray: 8 6; }
.bericht .wb-wurf { fill: var(--akzent); }
.bericht .wb-wert { fill: var(--akzent-schrift); font-family: var(--familie-zahl); font-size: 20px; font-weight: 700; }
.bericht .wb-leer { fill: var(--grund); stroke: var(--rand); stroke-width: 1.5; stroke-dasharray: 3 3; }
.bericht .wb-leer-text { fill: var(--gedaempft); font-size: 18px; }
.bericht .wb-name { fill: var(--gedaempft); font-size: 17px; }

/* Druck: A4, ohne Bedienelemente; hell machen die Tokens. Zugeklappte Details
   bleiben zu — wer sie auf Papier will, klappt sie vorher auf. */
@page { size: A4; margin: 15mm; }
@media print {
  body { background: #ffffff; }
  .kopfleiste { display: none; }
  .bericht { font-size: 11pt; max-width: none; padding: 0; }
  .bericht h2 { break-after: avoid; margin-top: 1.2rem; }
  .bericht table, .bericht .spielerin, .bericht .diagramm { break-inside: avoid; }
  .bericht summary { list-style: none; }
  .bericht .fuss { margin-top: 1.5rem; }
}
`;
