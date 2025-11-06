import { routes } from "./routes.js";
import { hasAccess, initLoginForm } from "./auth.js";

const MAIN_OUTLET_ID = "content";
const SUBPAGE_OUTLET_ID = "subPageContent";

const LOGIN_PLACEHOLDER_HTML = `
  <div class="login-required">
    <p>Pro zobrazení této stránky se přihlaste.</p>
  </div>
`;

// Načtení HTML souboru
async function fetchHtml(path) {
  const resp = await fetch(path);

  if (!resp.ok) {
    throw new Error(`Chyba při načítání "${path}": ${resp.status} ${resp.statusText}`);
  }

  return await resp.text();
}

function getCurrentHash() {
  let hash = window.location.hash;

  if (!hash) {
    hash = "#Home";
    window.location.hash = hash;
  }
  return hash;
}

// Vykreslení HTML do zadaného elementu
function renderInto(outletId, html) {
  const el = document.getElementById(outletId);
  if (!el) {
    console.error(`Element s id="${outletId}" nebyl nalezen.`);
    return;
  }
  el.innerHTML = html;
}

// Hlavní loader podle hashe
async function loadByHash(hash) {
  let route = routes[hash];

  // neznámý hash → přesměruj na Home
  if (!route) {
    console.warn(`Route pro hash "${hash}" nenalezena, přesměrovávám na #Home`);
    window.location.hash = "#Home";
    return;
  }

  // SubPage (má parent) — nejdřív natáhneme parent do MAIN_OUTLET_ID
  if (route.parent) {
    const parentRoute = routes[route.parent];
    if (!parentRoute) {
      console.error(`Parent route "${route.parent}" pro "${hash}" neexistuje.`);
      return;
    }

    const parentHtml = await fetchHtml(parentRoute.path);
    renderInto(MAIN_OUTLET_ID, parentHtml);

    // pak řešíme samotnou subPage
    if (route.requiresPassword && !hasAccess(hash)) {
      renderInto(SUBPAGE_OUTLET_ID, LOGIN_PLACEHOLDER_HTML);
      return;
    }

    const subHtml = await fetchHtml(route.path);
    renderInto(SUBPAGE_OUTLET_ID, subHtml);
    return;
  }

  // Hlavní stránka (bez parent)
  if (route.requiresPassword && !hasAccess(hash)) {
    renderInto(MAIN_OUTLET_ID, LOGIN_PLACEHOLDER_HTML);
    return;
  }

  const html = await fetchHtml(route.path);
  renderInto(MAIN_OUTLET_ID, html);

  // Inicializace login formuláře po načtení login stránky
  if (hash === "#Login") {
    initLoginForm();
  }
}

async function handleHashChange() {
  const hash = getCurrentHash();
  await loadByHash(hash);
}

function initRouter() {
  handleHashChange();
  window.addEventListener("hashchange", handleHashChange);
}

document.addEventListener("DOMContentLoaded", initRouter);
