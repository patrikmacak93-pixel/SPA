// src/js/auth.js

// ---------------------------
// 1) STAV PŘIHLÁŠENÍ
// ---------------------------

let loginState = {
  isLoggedIn: false,
  username: null,
  accesses: [],
  lastActivity: null   // timestamp poslední aktivity (Date.now())
};


const LOGIN_API_URL = "http://localhost:1880/login";
const LOGIN_STORAGE_KEY = "spaLoginState";
const INACTIVITY_LIMIT_MS = 20 * 60 * 1000; // 20 minut v milisekundách

// Načtení stavu z localStorage
function loadLoginState() {
  try {
    const raw = localStorage.getItem(LOGIN_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);

    loginState.isLoggedIn   = !!parsed.isLoggedIn;
    loginState.username     = parsed.username || null;
    loginState.accesses     = Array.isArray(parsed.accesses) ? parsed.accesses : [];
    loginState.lastActivity = typeof parsed.lastActivity === "number" ? parsed.lastActivity : null;
  } catch (err) {
    console.warn("Nepodařilo se načíst loginState z localStorage", err);
  }
}

function saveLoginState() {
  try {
    const toSave = {
      isLoggedIn:   loginState.isLoggedIn,
      username:     loginState.username,
      accesses:     loginState.accesses,
      lastActivity: loginState.lastActivity
    };
    localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.warn("Nepodařilo se uložit loginState do localStorage", err);
  }
}

function updateLastActivity() {
  if (!loginState.isLoggedIn) return;
  loginState.lastActivity = Date.now();
  saveLoginState();
}

function checkInactivity() {
  if (!loginState.isLoggedIn || !loginState.lastActivity) return;

  const now = Date.now();
  const diff = now - loginState.lastActivity;

  if (diff > INACTIVITY_LIMIT_MS) {
    // Automatické odhlášení
    alert("Byl jsi automaticky odhlášen z důvodu neaktivity.");
    clearLogin();
    window.location.hash = "#Login"; // můžeš změnit na "#Home" podle preference
  }
}

function handleUserActivity() {
  // Každá akce uživatele resetuje čas neaktivity
  updateLastActivity();
}

function setupInactivityTracking() {
  const events = ["click", "keydown", "mousemove", "scroll", "touchstart"];

  events.forEach(ev => {
    document.addEventListener(ev, handleUserActivity, { passive: true });
  });

  // Kontrola třeba každou minutu
  setInterval(checkInactivity, 60 * 1000);
}


// ---------------------------
// 2) PRÁCE SE STAVEM
// ---------------------------

export function getLoginState() {
  return { ...loginState };
}

export function userIsLoggedIn() {
  return loginState.isLoggedIn;
}

export function hasAccess(hash) {
  if (!loginState.isLoggedIn) return false;
  if (!loginState.accesses || loginState.accesses.length === 0) return false;

  return loginState.accesses.includes(hash);
}

function setLoginSuccess(accesses, username) {
  loginState.isLoggedIn   = true;
  loginState.username     = username || null;
  loginState.accesses     = accesses || [];
  loginState.lastActivity = Date.now(); // přihlášení = aktivita

  saveLoginState();
  updateLoginNavLink();
}

function clearLogin() {
  loginState.isLoggedIn   = false;
  loginState.username     = null;
  loginState.accesses     = [];
  loginState.lastActivity = null;

  saveLoginState();
  updateLoginNavLink();
}



function updateLoginNavLink() {
  const loginLink = document.getElementById("loginNavLink");
  if (!loginLink) return;

  if (loginState.isLoggedIn && loginState.username) {
    // Uživatel přihlášen – zobrazíme jeho jméno a odkaz na profil
    loginLink.textContent = loginState.username;
    loginLink.setAttribute("href", "#Profile");
  } else {
    // Uživatel odhlášen – klasický „Login“
    loginLink.textContent = "Login";
    loginLink.setAttribute("href", "#Login");
  }
}


// ---------------------------
// 3) ODESLÁNÍ LOGIN FORMULÁŘE
// ---------------------------

async function sendLogin(username, password) {
  const resp = await fetch(LOGIN_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!resp.ok) {
    throw new Error("Chyba při komunikaci s přihlašovacím API");
  }

  return await resp.json();
}

// ---------------------------
// 4) PRÁCE S FORMULÁŘEM NA STRÁNCE
// ---------------------------

export function initLoginForm() {
  const form = document.getElementById("loginForm");
  const messageBox = document.getElementById("loginMessage");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = form.elements["username"].value;
    const password = form.elements["password"].value;

    try {
      const data = await sendLogin(username, password);

      if (data.message === "Login byl úspěšný") {
        setLoginSuccess(data.accesses, username);
        messageBox.textContent = "Přihlášení proběhlo úspěšně.";
        window.location.hash = "#Home";
      } else {
        clearLogin();
        messageBox.textContent = data.message || "Přihlášení selhalo.";
      }
    } catch (error) {
      clearLogin();
      console.error(error);
      messageBox.textContent = "Nastala chyba při přihlášení.";
    }
  });
}

// ---------------------------
// 5) ODHLÁŠENÍ
// ---------------------------

export function logout() {
  clearLogin();
  window.location.hash = "#Home";
}

document.addEventListener("DOMContentLoaded", () => {
  // 1) načti stav z localStorage
  loadLoginState();

  // 2) pokud už byl přihlášený, zkontroluj, jestli už nevypršel timeout
  checkInactivity();

  // 3) nastav stav odkazu v menu (Login / username)
  updateLoginNavLink();

  // 4) zapni sledování aktivity + pravidelnou kontrolu
  setupInactivityTracking();
});

