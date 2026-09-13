/**
 * Der Bericht bringt sein CSS als Text mit, damit die Exportdatei ohne die App
 * auskommt. Farben hängen ausschließlich an `--b-*`-Variablen; die App setzt den
 * dunklen Satz, die Datei den hellen.
 */
export const BERICHT_DUNKEL = `.bericht {
  --b-grund: #0d1b2a; --b-flaeche: #1b263b; --b-rand: #2e4057;
  --b-schrift: #e0e6ed; --b-gedaempft: #8fa3bf;
  --b-gut: #2ec4a6; --b-schlecht: #e5484d; --b-hervor: #f2c744;
  --b-gut-flaeche: rgba(46,196,166,.25); --b-schlecht-flaeche: rgba(229,72,77,.25);
}`;

export const BERICHT_HELL = `.bericht {
  --b-grund: #ffffff; --b-flaeche: #f3f5f8; --b-rand: #d5dbe3;
  --b-schrift: #14202e; --b-gedaempft: #5b6b80;
  --b-gut: #158f76; --b-schlecht: #c8353a; --b-hervor: #b8860b;
  --b-gut-flaeche: rgba(21,143,118,.18); --b-schlecht-flaeche: rgba(200,53,58,.18);
}`;

export const BERICHT_CSS = `
.bericht { background: var(--b-grund); color: var(--b-schrift); font: 15px/1.45 system-ui, sans-serif; max-width: 60rem; margin: 0 auto; padding: 1rem 1.25rem 2rem; }
.bericht h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
.bericht h2 { font-size: 1.15rem; margin: 2rem 0 .5rem; padding-bottom: .25rem; border-bottom: 1px solid var(--b-rand); }
.bericht h3 { font-size: 1.05rem; margin: 0; display: flex; align-items: baseline; gap: .5rem; }
.bericht .kopf { display: flex; flex-wrap: wrap; align-items: baseline; gap: 1rem 2rem; }
.bericht .kopf .endstand { font-size: 2.4rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.bericht .kopf .halbzeit, .bericht .kopf .datum { color: var(--b-gedaempft); }
.bericht .pruefung summary { cursor: pointer; color: var(--b-gedaempft); }
.bericht .pruefung.auffaellig summary { color: var(--b-schlecht); }
.bericht .pruefung ul { margin: .25rem 0; padding-left: 1.25rem; font-size: .9rem; }
.bericht table { border-collapse: collapse; width: 100%; font-variant-numeric: tabular-nums; }
.bericht th, .bericht td { text-align: left; padding: .3rem .5rem; border-bottom: 1px solid var(--b-rand); }
.bericht th.zahl, .bericht td.zahl { text-align: right; }
.bericht thead th { color: var(--b-gedaempft); font-weight: 600; }
.bericht .hinweis { color: var(--b-gedaempft); font-size: .9rem; }
.bericht .diagramm { display: block; margin: .5rem 0; }
.bericht .spielerin { background: var(--b-flaeche); border: 1px solid var(--b-rand); border-radius: 8px; padding: .75rem 1rem; margin: .75rem 0; }
.bericht .spielerin .nr { font-size: 1.4rem; font-weight: 700; min-width: 2.2rem; }
.bericht .spielerin .rolle { color: var(--b-gedaempft); font-size: .85rem; font-weight: 400; }
.bericht .werte { display: flex; flex-wrap: wrap; gap: .25rem 1.5rem; margin: .5rem 0 0; }
.bericht .werte div { display: flex; gap: .4rem; align-items: baseline; }
.bericht .werte dt { color: var(--b-gedaempft); font-size: .85rem; }
.bericht .werte dd { margin: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
.bericht .werte small { font-weight: 400; color: var(--b-gedaempft); }
.bericht .zaehler { margin: .35rem 0 0; color: var(--b-gedaempft); font-size: .9rem; }
.bericht .plusminus.plus { color: var(--b-gut); }
.bericht .plusminus.minus { color: var(--b-schlecht); }
.bericht .spielerin details { margin-top: .5rem; }
.bericht .spielerin summary { cursor: pointer; color: var(--b-gedaempft); }
.bericht .spielerin details table { font-size: .9rem; margin-top: .25rem; }
.bericht .warnung { color: var(--b-schlecht); }
.bericht .fuss { margin-top: 3rem; color: var(--b-gedaempft); font-size: .85rem; }

.bericht .vk-raster { stroke: var(--b-rand); stroke-width: 1; }
.bericht .vk-null { stroke: var(--b-gedaempft); stroke-width: 1.5; }
.bericht .vk-linie { fill: none; stroke: var(--b-schrift); stroke-width: 2.5; stroke-linejoin: round; }
.bericht .vk-plus { fill: var(--b-gut-flaeche); }
.bericht .vk-minus { fill: var(--b-schlecht-flaeche); }
.bericht .vk-achse-text { fill: var(--b-gedaempft); font-size: 12px; }
.bericht .vk-halbzeit line { stroke: var(--b-gedaempft); stroke-dasharray: 4 4; }
.bericht .vk-halbzeit text { fill: var(--b-gedaempft); font-size: 12px; }
.bericht .vk-auszeit { fill: var(--b-hervor); }
.bericht .vk-strafe { stroke: var(--b-schlecht); stroke-width: 3; }
.bericht .pb-grund { stroke: var(--b-gedaempft); }
.bericht .pb-tore { fill: var(--b-gut); }
.bericht .pb-gegentore { fill: var(--b-schlecht); }
.bericht .pb-wert { fill: var(--b-schrift); font-size: 12px; }
.bericht .pb-achse-text { fill: var(--b-gedaempft); font-size: 12px; }
.bericht .el-grund { fill: var(--b-rand); }
.bericht .el-feld { fill: var(--b-gut); }
.bericht .el-strafe { fill: var(--b-schlecht); }
.bericht .el-tor { fill: var(--b-hervor); }
.bericht .el-halbzeit { stroke: var(--b-gedaempft); stroke-dasharray: 3 3; }
`;
