// ==UserScript==
// @name         TMOHentai - Listas PRO
// @namespace    https://tmohentai.com/
// @version      2026.05.13
// @description  Etiquetas + modo PRO + auto listas + fix hora + SPA FIX (original logic)
// @author       wernser412
// @icon         https://github.com/wernser412/TMOHentai-Tags/blob/main/ICONO.png?raw=true
// @downloadURL  https://github.com/wernser412/TMOHentai-Tags/raw/refs/heads/main/TMOHentai%20-%20Listas%20PRO.user.js
// @match        https://tmohentai.com/*
// @match        https://tmohentai.app/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js
// ==/UserScript==

(function () {
'use strict';

/* ================= CONFIG ================= */

const ESPERA_MS = 250;
const sleep = ms => new Promise(r=>setTimeout(r,ms));

const COLORES = [
 "#f94144","#f3722c","#f8961e","#f9c74f",
 "#90be6d","#43aa8b","#577590","#9b5de5",
 "#f15bb5","#4d96ff","#6a994e","#ffb703"
];

/* ================= MENSAJE ================= */

function msg(txt){
 let box=document.getElementById("tmo-msg");
 if(!box){
  box=document.createElement("div");
  box.id="tmo-msg";
  Object.assign(box.style,{
   position:"fixed",top:"10px",right:"10px",
   background:"#111",color:"#fff",
   padding:"10px 14px",borderRadius:"8px",
   zIndex:99999,fontSize:"13px"
  });
  document.body.appendChild(box);
 }
 box.textContent=txt;
}

function hideMsg(){
 document.getElementById("tmo-msg")?.remove();
}

/* ================= FETCH ================= */

async function fetchHTML(url){
 try{
  const res=await fetch(url,{credentials:"include"});
  const text=await res.text();
  return new DOMParser().parseFromString(text,"text/html");
 }catch(e){
  console.warn("Error:",url);
  return null;
 }
}

/* ================= LISTAS ================= */

async function capturarListas(){

 const listas = {};
 const BASE = location.origin;
 const url = BASE + "/perfil?tab=lists";

 try{
  const res = await fetch(url,{
   credentials:"include",
   headers:{
    "Accept":"text/html",
    "X-Requested-With":"XMLHttpRequest"
   }
  });

  const html = await res.text();
  const doc = new DOMParser().parseFromString(html,"text/html");

  let enlaces = doc.querySelectorAll(".pfl-list-title");

  if(!enlaces.length){
   enlaces = doc.querySelectorAll("a[href*='/lists/']");
  }

  if(!enlaces.length){
   msg("❌ No se detectaron listas");
   setTimeout(hideMsg,1500);
   return {};
  }

  enlaces.forEach(a=>{
   const nombre = a.textContent.trim();
   const link = a.href;

   if(!nombre || !link.includes("/lists/")) return;

   if(!listas[nombre]) listas[nombre]=[];
   listas[nombre].push(link);
  });

  GM_setValue("tmo_listas",listas);

  msg(`✅ Listas: ${Object.keys(listas).length}`);
  setTimeout(hideMsg,1200);

  return listas;

 }catch(e){
  console.error(e);
  msg("❌ Error capturando listas");
  setTimeout(hideMsg,1500);
  return {};
 }
}

/* ================= CARGA PRO ================= */

async function cargarPRO(){

 const listas=GM_getValue("tmo_listas",{});
 const mangas={};

 let totalListas = Object.keys(listas).length;
 let indexLista = 0;

 for(const [nombre,links] of Object.entries(listas)){
  indexLista++;

  for(const url of links){

   msg(`🚀 ${nombre} (${indexLista}/${totalListas})`);

   let page=1;
   let seguir=true;

   while(seguir){

    const doc=await fetchHTML(url+"?page="+page);
    if(!doc) break;

    const items=doc.querySelectorAll(".list-manga-wrap");
    if(!items.length) break;

    let nuevos=0;

    items.forEach(wrap=>{
     const btn=wrap.querySelector(".btn-remove-from-list");
     if(!btn) return;

     const id=btn.dataset.mangaId;
     if(!id) return;

     if(!mangas[id]){
      mangas[id]=[];
      nuevos++;
     }

     if(!mangas[id].includes(nombre)){
      mangas[id].push(nombre);
     }
    });

    if(page % 3 === 0){
     msg(`📄 ${nombre} - página ${page}`);
    }

    if(nuevos===0) seguir=false;

    page++;
    await sleep(ESPERA_MS);
   }
  }
 }

 GM_setValue("tmo_mangas",mangas);

 msg("🎉 Listas actualizadas");
 setTimeout(hideMsg,1500);
}

/* ================= TODO EN UNO ================= */

async function todoEnUno(){
 msg("⚡ Iniciando...");
 await capturarListas();
 await cargarPRO();
 aplicarEtiquetas();
}

/* ================= LIMPIAR ================= */

function limpiarCache(){
 GM_setValue("tmo_listas",{});
 GM_setValue("tmo_mangas",{});
 GM_setValue("tmo_colores",{});
 msg("🧹 Caché limpiado");
 setTimeout(hideMsg,1200);
}

/* ================= HORA ================= */

function aplicarHora(){
 const v = GM_getValue("hora", false);
 document.querySelectorAll(".content-detail")
  .forEach(e => e.style.display = v ? "none" : "");
}

function toggleHora(){
 const v = !GM_getValue("hora", false);
 GM_setValue("hora", v);
 aplicarHora();
 msg(v ? "⏰ Hora oculta" : "⏰ Hora visible");
 setTimeout(hideMsg,1000);
}

/* ================= YAOI ================= */

function aplicarYaoi(){
 const v = GM_getValue("yaoi", false);
 document.querySelectorAll(".element-thumbnail").forEach(el=>{
  if(!el.querySelector(".data-type-yaoi")) return;
  el.style.display = v ? "none" : "";
 });
}

function toggleYaoi(){
 const v = !GM_getValue("yaoi", false);
 GM_setValue("yaoi", v);
 aplicarYaoi();
 msg(v ? "🚫 Yaoi oculto" : "👁️ Yaoi visible");
 setTimeout(hideMsg,1000);
}

/* ================= ETIQUETAS ================= */

GM_addStyle(`
.tmo-en-lista{
 outline:3px solid #ffd000;
 outline-offset:-3px;
 border-radius:8px;
 box-shadow:0 0 8px rgba(255,208,0,.6);
}
`);

/* ================= PREVIEW PRO ================= */

GM_addStyle(`

#md-preview-grid{
 overflow-x:auto;
 padding:12px 4px !important;
 gap:12px !important;
 scroll-behavior:smooth;
}

#md-preview-grid a{
 position:relative;
 display:inline-block !important;
 overflow:visible !important;
 transition:z-index .15s ease;
}

#md-preview-grid a:hover{
 z-index:99999;
}

#md-preview-grid img{
 width:95px !important;
 height:135px !important;
 object-fit:cover !important;
 border-radius:10px;
 transition:
  transform .18s ease,
  box-shadow .18s ease,
  filter .18s ease;
 cursor:pointer;
 background:#111;
}

#md-preview-grid a:hover img{
 transform:scale(2.6);
 box-shadow:0 12px 35px rgba(0,0,0,.75);
 filter:brightness(1.05);
}

#tmo-preview-pro{
 position:fixed;
 right:20px;
 top:50%;
 transform:translateY(-50%);
 max-height:88vh;
 max-width:42vw;
 z-index:999999;
 border-radius:12px;
 box-shadow:0 0 40px rgba(0,0,0,.85);
 display:none;
 pointer-events:none;
 background:#000;
}

#md-preview-grid::-webkit-scrollbar{
 height:10px;
}

#md-preview-grid::-webkit-scrollbar-thumb{
 background:#555;
 border-radius:999px;
}

#md-preview-grid::-webkit-scrollbar-track{
 background:transparent;
}

`);

function aplicarEtiquetas(){

 const mangas=GM_getValue("tmo_mangas",{});
 if(!Object.keys(mangas).length) return;

 const colores=GM_getValue("tmo_colores",{});
 let idx=0;

 document.querySelectorAll(".element-thumbnail, .list-manga-wrap").forEach(card=>{

  let id;

  const btn=card.querySelector(".btn-remove-from-list");
  if(btn){
   id=btn.dataset.mangaId;
  }else{
   const a=card.querySelector("a[href*='/library/']");
   const m=a?.href.match(/\/(\d+)\//);
   if(m) id=m[1];
  }

  if(!id) return;

  const thumb=card.querySelector(".work-thumbnail");
  if(!thumb) return;

  thumb.classList.remove("tmo-en-lista");
  thumb.querySelectorAll(".tmo-labels").forEach(e=>e.remove());

  const listas=mangas[id];
  if(!listas) return;

  thumb.classList.add("tmo-en-lista");
  thumb.style.position="relative";

  const wrap=document.createElement("div");
  wrap.className="tmo-labels";

  Object.assign(wrap.style,{
   position:"absolute",
   bottom:"6px",
   left:"6px",
   display:"flex",
   flexDirection:"column",
   gap:"3px",
   zIndex:50
  });

  listas.forEach(lista=>{
   if(!colores[lista]) colores[lista]=COLORES[idx++%COLORES.length];

   const tag=document.createElement("div");
   tag.textContent=lista;

   Object.assign(tag.style,{
    background:colores[lista],
    color:"#000",
    padding:"2px 6px",
    fontSize:"11px",
    fontWeight:"bold",
    borderRadius:"5px"
   });

   wrap.appendChild(tag);
  });

  thumb.appendChild(wrap);
 });

 GM_setValue("tmo_colores",colores);
}



/* ================= EXPORTAR EXCEL XLSM ================= */

async function exportarExcel(){

 const listas = GM_getValue("tmo_listas",{});

 if(!Object.keys(listas).length){
  msg("❌ Primero usa: Capturar + Cargar PRO");
  setTimeout(hideMsg,1500);
  return;
 }

 const excelData = [];

 for(const [nombre,links] of Object.entries(listas)){

  // TITULO LISTA
  excelData.push({
   Nombre: nombre,
   URL: null
  });

  for(const url of links){

   let page = 1;
   let seguir = true;

   while(seguir){

    msg(`📊 ${nombre} - página ${page}`);

    const doc = await fetchHTML(url+"?page="+page);

    if(!doc) break;

    const items = doc.querySelectorAll(".list-manga-wrap");

    if(!items.length) break;

    items.forEach(wrap=>{

     const a = wrap.querySelector("a[href*='/library/']");

     if(!a) return;

     const titulo =
      a.getAttribute("title") ||
      a.textContent.trim() ||
      "Sin título";

     const link = a.href || "";

     excelData.push({
      Nombre: titulo,
      URL: link
     });

    });

    if(items.length < 20){
     seguir = false;
    }

    page++;

    await sleep(ESPERA_MS);
   }
  }

  // ESPACIO ENTRE LISTAS
  excelData.push({
   Nombre: null,
   URL: null
  });
 }

 /* ===== EXCEL ===== */

 const ws = XLSX.utils.json_to_sheet(
  excelData,
  {
   skipHeader:true
  }
 );

 const wb = XLSX.utils.book_new();

 XLSX.utils.book_append_sheet(
  wb,
  ws,
  "Listas"
 );

 XLSX.writeFile(
  wb,
  "tmohentai-listas.xlsm",
  {
   bookType:"xlsm"
  }
 );

 msg("✅ XLSM exportado");

 setTimeout(hideMsg,1500);
}




/* ================= MENU ================= */

GM_registerMenuCommand("⚡ Capturar + Cargar PRO",todoEnUno);
GM_registerMenuCommand("📊 Exportar listas (Excel)",exportarExcel);
GM_registerMenuCommand("🧹 Limpiar mangas guardados",limpiarCache);
GM_registerMenuCommand("⏰ Hora ON/OFF",toggleHora);
GM_registerMenuCommand("🚫 Yaoi ON/OFF",toggleYaoi);


/* ================= HOVER PREVIEW ================= */

const hoverPreview = document.createElement("img");

hoverPreview.id = "tmo-preview-pro";

document.body.appendChild(hoverPreview);

document.addEventListener("mouseover", e => {

 const img = e.target.closest("#md-preview-grid img");

 if(!img) return;

 hoverPreview.src = img.src;

 hoverPreview.style.display = "block";

});

document.addEventListener("mouseout", e => {

 if(e.target.closest("#md-preview-grid img")){

  hoverPreview.style.display = "none";

 }

});

/* ================= INIT ================= */

window.addEventListener("load", ()=>{
 aplicarEtiquetas();
 aplicarHora();
 aplicarYaoi();
});

/* ================= SPA FIX ================= */

let timeout;

const observer = new MutationObserver(() => {

 clearTimeout(timeout);

 timeout = setTimeout(() => {
  aplicarEtiquetas();
  aplicarHora();
  aplicarYaoi();
 }, 300);

});

observer.observe(document.body,{
 childList:true,
 subtree:true
});

})();
