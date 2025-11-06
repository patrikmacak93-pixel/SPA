// src/js/auth.js

// Jednoduchý stav přihlášení v paměti prohlížeče
let loginState = {
  isLoggedIn: false,
  accesses: []   // např. ["#pckDtbSearch", "#Admin"]
};

// Změň si podle svého Node-RED flow:
const LOGIN_API_URL = "http://localhost:1880/login"; // např. "http://localhost:1880/login"

export function getLoginState() {
  return { ...loginState };
}

export function hasAccess(hash) {
  // tuto funkci volá router pro stránky s requiresPassword === true
  if (!loginState.isLoggedIn) return false;
  // očekáváme, že Node-RED pošle hashe rout, ke kterým má uživatel přístup
  return loginState.accesses.includes(hash);
}

function setLoginSuccess(accesses = []) {
  loginState.isLoggedIn = true;
  loginState.accesses = Array.isArray(accesses) ? accesses : [];
}

function setLogout() {
  loginState.isLoggedIn = false;
  loginState.accesses = [];
}

// Inicializace přihlašovacího formuláře na login.html
export function initLoginForm() {
  const form = document.getElementById("login-form");
  const msgBox = document.getElementById("login-message");

  if (!form) {
    // stránka ještě není v DOMu, nic neděláme
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const username = formData.get("username");
    const password = formData.get("password");

    if (msgBox) {
      msgBox.textContent = "Přihlašuji…";
    }

    try {
      const resp = await fetch(LOGIN_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ username, password })
      });

      if (!resp.ok) {
        throw new Error(`Chyba API: ${resp.status} ${resp.statusText}`);
      }

      // očekáváme JSON z Node-RED:
      // { "message": "Login byl úspěšný", "accesses": ["#pckDtbSearch", ...] }
      let data;
      try {
        data = await resp.json();
      } catch (e) {
        // fallback – Node-RED poslal jen text
        const text = await resp.text();
        data = { message: text };
      }

      if (data.message === "Login byl úspěšný") {
        setLoginSuccess(data.accesses);
        if (msgBox) {
          msgBox.textContent = "Přihlášení proběhlo úspěšně.";
        }
        // po úspěšném loginu klidně přesměrujeme na Home
        window.location.hash = "#Home";
      } else {
        if (msgBox) {
          msgBox.textContent = data.message || "Přihlášení se nezdařilo.";
        }
      }
    } catch (error) {
      console.error(error);
      if (msgBox) {
        msgBox.textContent = "Došlo k chybě při přihlášení.";
      }
    }
  });
}

// (volitelné) jednoduchá funkce pro odhlášení – můžeš použít později
export function logout() {
  setLogout();
  window.location.hash = "#Home";
}

/*
nastav, ať endpoint LOGIN_API_URL vrací JSON ve tvaru např.
{ "message": "Login byl úspěšný", "accesses": ["#pckDtbSearch"] }

accesses jsou hashe rout, které se mají uživateli odemknout.
*/