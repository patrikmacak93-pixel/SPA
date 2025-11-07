// src/js/auth.js

// ---------------------------
// 1) STAV PŘIHLÁŠENÍ
// ---------------------------

let loginState = {
  isLoggedIn: false,
  username: null,
  accesses: []   // např. ["#pckDtbSearch", "#TestPP"]
};

const LOGIN_API_URL = "http://localhost:1880/login";

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
  loginState.isLoggedIn = true;
  loginState.username = username || null;
  loginState.accesses = accesses || [];
  updateLoginNavLink();
}

function clearLogin() {
  loginState.isLoggedIn = false;
  loginState.username = null;
  loginState.accesses = [];
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
  updateLoginNavLink();
});
