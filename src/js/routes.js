// src/js/routes.js
export const routes = {
  "#Home": {
    path: "src/features/Home/home.html",
    requiresPassword: false
  },
  "#Tools": {
    path: "src/features/Tools/tools.html",
    requiresPassword: false
  },
  "#Login": {
    path: "src/features/Auth/login.html",
    requiresPassword: false
  },

  // SubPage pro Tools – načte se do #subPageContent
  "#pckDtbSearch": {
    path: "src/features/Tools/pckDtbView.html",
    requiresPassword: true,   // chráněná stránka
    parent: "#Tools"          // obsah do subPageContent
  }

  // další subPages:
  // "#něco": { path: "…", parent: "#Tools", requiresPassword: false }
};
