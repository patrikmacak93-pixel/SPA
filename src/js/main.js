// src/js/main.js
import { routes } from "./routes.js";
import { hasAccess, initLoginForm } from "./auth.js";
import { initPckDtbEditForm } from "./pckDtbEdit.js";

const MAIN_OUTLET_ID = "content";
const SUBPAGE_OUTLET_ID = "subPageContent";

const LOGIN_PLACEHOLDER_HTML = `
  <div class="login-required">
    <p>Pro zobrazení této stránky se musíte přihlásit nebo nemáte dostatečné oprávnění.</p>
  </div>
`;

// ---------------------------
// 1) Pomocné funkce pro DOM
// ---------------------------

function setHtmlById(id, html) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html;
}

// ---------------------------
// 2) Načítání souborů
// ---------------------------

async function fetchHtml(path) {
  const resp = await fetch(path);

  if (!resp.ok) {
    throw new Error(`Chyba při načítání "${path}": ${resp.status} ${resp.statusText}`);
  }

  return await resp.text();
}

function showPdfInSubpage(path) {
  const html = `
    <iframe 
      src="${path}" 
      style="width:100%;height:80vh;border:none;">
    </iframe>
  `;
  setHtmlById(SUBPAGE_OUTLET_ID, html);
}

async function showHtmlInSubpage(path) {
  const html = await fetchHtml(path);
  setHtmlById(SUBPAGE_OUTLET_ID, html);
}

// ---------------------------
// 3) Router – výběr routy
// ---------------------------

function getCurrentHash() {
  return window.location.hash || "#Home";
}

function getRoute(hash) {
  return routes[hash] || routes["#Home"];
}

// ---------------------------
// 4) Hlavní logika načítání
// ---------------------------

async function loadByHash(hash) {
  const route = getRoute(hash);

  // 1) kontrola přístupu k danému hashi
  if (route.requiresPassword && !hasAccess(hash)) {
    setHtmlById(MAIN_OUTLET_ID, LOGIN_PLACEHOLDER_HTML);
    return;
  }

  // 2) zjistíme, co je "hlavní stránka"
  //    - pokud má route parent, tak hlavní je parent
  //    - jinak je hlavní sama route
  const mainRoute = route.parent ? routes[route.parent] : route;

  // načteme HTML hlavní stránky do #content
  const mainHtml = await fetchHtml(mainRoute.path);
  setHtmlById(MAIN_OUTLET_ID, mainHtml);

  // 3) subPage (pokud existuje kontejner a pokud je route subPage)
  const subContainer = document.getElementById(SUBPAGE_OUTLET_ID);
  if (subContainer) {
    // vždy vyčistíme
    subContainer.innerHTML = "";

    // pokud je to opravdu subPage (route má parent)
    if (route.parent) {
      if (route.isPdf) {
        // PDF subPage
        showPdfInSubpage(route.path);
      } else {
        // HTML subPage
        await showHtmlInSubpage(route.path);
      }
    }
  }

  // 4) speciální inicializace pro konkrétní stránky
  if (hash === "#Login") {
    initLoginForm();
  }

  if (hash === "#pckDtbEdit") {
    initPckDtbEditForm();
  }
}

// ---------------------------
// 5) Reakce na změnu hash
// ---------------------------

async function handleHashChange() {
  const hash = getCurrentHash();
  await loadByHash(hash);
}

// ---------------------------
// 6) Start routeru
// ---------------------------

function initRouter() {
  handleHashChange();
  window.addEventListener("hashchange", handleHashChange);
}

document.addEventListener("DOMContentLoaded", initRouter);
