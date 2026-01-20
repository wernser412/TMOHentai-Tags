// ==UserScript==
// @name         TMOHentai - Listas PRO
// @namespace    https://tmohentai.com/
// @version      2026.01.19
// @description  Etiquetas por listas, marco amarillo y botones de control
// @author       wernser412
// @icon         https://github.com/wernser412/TMOHentai-Tags/blob/main/ICONO.png?raw=true
// @downloadURL  https://github.com/wernser412/TMOHentai-Tags/raw/refs/heads/main/TMOHentai%20-%20Listas%20PRO.user.js
// @match        https://tmohentai.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        unsafeWindow
// ==/UserScript==

(function () {
    'use strict';

    /* ================= CONFIG ================= */

    const MAX_PAGINAS_LISTAS = 5;
    const ESPERA_MS = 1200;
    const ESPERA_RATE = 3000;

    const COLORES = [
        "#f94144", "#f3722c", "#f8961e", "#f9c74f",
        "#90be6d", "#43aa8b", "#577590", "#9b5de5",
        "#f15bb5", "#4d96ff", "#6a994e", "#ffb703"
    ];

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    /* ================= ESTILOS ================= */

    GM_addStyle(`
        .tmo-en-lista {
            outline: 3px solid #ffd000;
            outline-offset: -3px;
            border-radius: 8px;
            box-shadow: 0 0 8px rgba(255, 208, 0, 0.6);
        }
    `);

    /* ================= MENSAJE ================= */

    function mostrarMensaje(txt) {
        let box = document.getElementById("tmo-msg");
        if (!box) {
            box = document.createElement("div");
            box.id = "tmo-msg";
            Object.assign(box.style, {
                position: "fixed",
                top: "10px",
                right: "10px",
                background: "#111",
                color: "#fff",
                padding: "10px 14px",
                borderRadius: "8px",
                zIndex: 99999,
                fontSize: "13px",
                boxShadow: "0 0 10px rgba(0,0,0,.6)"
            });
            document.body.appendChild(box);
        }
        box.textContent = txt;
    }

    function ocultarMensaje() {
        document.getElementById("tmo-msg")?.remove();
    }

    /* ================= HORA ================= */

    function aplicarEstadoHora() {
        const ocultar = GM_getValue("tmo_ocultar_hora", false);
        document.querySelectorAll(".content-detail").forEach(el => {
            el.style.display = ocultar ? "none" : "";
        });
    }

    function toggleHora() {
        const actual = GM_getValue("tmo_ocultar_hora", false);
        GM_setValue("tmo_ocultar_hora", !actual);
        aplicarEstadoHora();
        mostrarMensaje(!actual ? "⏰ Hora oculta" : "⏰ Hora visible");
        setTimeout(ocultarMensaje, 1200);
    }

    /* ================= YA0I ================= */

    function aplicarEstadoYaoi() {
        const ocultar = GM_getValue("tmo_ocultar_yaoi", false);

        document.querySelectorAll(".element-thumbnail").forEach(el => {
            const esYaoi = el.querySelector(".data-type-yaoi");
            if (!esYaoi) return;
            el.style.display = ocultar ? "none" : "";
        });
    }

    function toggleYaoi() {
        const actual = GM_getValue("tmo_ocultar_yaoi", false);
        GM_setValue("tmo_ocultar_yaoi", !actual);
        aplicarEstadoYaoi();
        mostrarMensaje(!actual ? "🚫 Yaoi oculto" : "👁️ Yaoi visible");
        setTimeout(ocultarMensaje, 1200);
    }

    /* ================= AVISO ================= */

    function verificarActualizacion() {
        const mangas = GM_getValue("tmo_mangas", {});
        if (!Object.keys(mangas).length) {
            mostrarMensaje("⚠️ Falta actualizar listas (Tampermonkey)");
        }
    }

    /* ================= LISTAS ================= */

    async function obtenerListas() {
        const listas = {};
        for (let page = 1; page <= MAX_PAGINAS_LISTAS; page++) {
            const url = page === 1 ? "/account/lists" : `/account/lists?page=${page}`;
            const res = await fetch(url);
            const html = await res.text();
            const doc = new DOMParser().parseFromString(html, "text/html");

            doc.querySelectorAll(".list-group a.list-group-item").forEach(a => {
                const nombre = a.childNodes[0].textContent.trim();
                if (!listas[nombre]) listas[nombre] = [];
                listas[nombre].push(a.href);
            });

            await sleep(ESPERA_MS);
        }
        GM_setValue("tmo_listas", listas);
        return listas;
    }

    async function obtenerMangas(listas) {
        const mangas = {};
        const urls = [];
        for (const v of Object.values(listas)) urls.push(...v);

        let i = 0;
        for (const [lista, links] of Object.entries(listas)) {
            for (const url of links) {
                i++;
                mostrarMensaje(`🔄 Actualizando listas (${i}/${urls.length})`);

                const res = await fetch(url);
                const html = await res.text();

                if (/keep calm|too many requests/i.test(html)) {
                    await sleep(ESPERA_RATE);
                    continue;
                }

                const doc = new DOMParser().parseFromString(html, "text/html");
                doc.querySelectorAll('a[href*="/contents/"]').forEach(a => {
                    const m = a.href.match(/\/contents\/([a-z0-9]+)/i);
                    if (!m) return;
                    const id = m[1];
                    if (!mangas[id]) mangas[id] = [];
                    if (!mangas[id].includes(lista)) mangas[id].push(lista);
                });

                await sleep(ESPERA_MS);
            }
        }

        GM_setValue("tmo_mangas", mangas);
    }

    /* ================= ETIQUETAS ================= */

    function aplicarEtiquetas() {
        const mangas = GM_getValue("tmo_mangas", {});
        if (!Object.keys(mangas).length) return;

        const colores = GM_getValue("tmo_colores", {});
        let idx = Object.keys(colores).length;

        document.querySelectorAll(".element-thumbnail").forEach(card => {
            const link = card.querySelector('a[href*="/contents/"]');
            if (!link) return;

            const m = link.href.match(/\/contents\/([a-z0-9]+)/i);
            if (!m) return;

            const thumb = card.querySelector(".work-thumbnail");
            if (!thumb) return;

            thumb.classList.remove("tmo-en-lista");
            thumb.querySelectorAll(".tmo-labels").forEach(e => e.remove());

            const listas = mangas[m[1]];
            if (!listas) return;

            thumb.classList.add("tmo-en-lista");
            thumb.style.position = "relative";

            const wrap = document.createElement("div");
            wrap.className = "tmo-labels";
            Object.assign(wrap.style, {
                position: "absolute",
                bottom: "6px",
                left: "6px",
                display: "flex",
                flexDirection: "column",
                gap: "3px",
                zIndex: 50
            });

            listas.forEach(lista => {
                if (!colores[lista]) colores[lista] = COLORES[idx++ % COLORES.length];
                const tag = document.createElement("div");
                tag.textContent = "📁 " + lista;
                Object.assign(tag.style, {
                    background: colores[lista],
                    color: "#000",
                    padding: "2px 6px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    borderRadius: "5px"
                });
                wrap.appendChild(tag);
            });

            thumb.appendChild(wrap);
        });

        GM_setValue("tmo_colores", colores);
    }

    /* ================= MENU ================= */

    GM_registerMenuCommand("🔄 Actualizar listas TMO", async () => {
        const listas = await obtenerListas();
        await obtenerMangas(listas);
        mostrarMensaje("✅ Listas actualizadas");
        setTimeout(ocultarMensaje, 1500);
    });

    GM_registerMenuCommand("🧹 Limpiar caché TMO", () => {
        GM_setValue("tmo_listas", {});
        GM_setValue("tmo_mangas", {});
        GM_setValue("tmo_colores", {});
        verificarActualizacion();
    });

    GM_registerMenuCommand("⏰ Mostrar / Ocultar hora", toggleHora);
    GM_registerMenuCommand("🚫 Ocultar / Mostrar Yaoi", toggleYaoi);

    /* ================= AUTO ================= */

    verificarActualizacion();

    setTimeout(() => {
        aplicarEtiquetas();
        aplicarEstadoHora();
        aplicarEstadoYaoi();
    }, 2000);

})();
