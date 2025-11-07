// src/js/routes.js

export const routes = {
  // ---------------
  // Main pages
  // ---------------

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

  "#Profile": {
  path: "src/features/Auth/profile.html",
  requiresPassword: true
},

  "#Presentations": {
    path: "src/features/Presentations/presentations.html",
    requiresPassword: false
  },

  //--------------
  // PDF files
  //--------------

  "#TestPP": {
    path: "src/features/Presentations/TestPP.pdf",
    requiresPassword: true,
    parent: "#Presentations",
    isPdf: true
  },

  //--------------
  // SubPages
  //-------------

  "#pckDtbSearch": {
    path: "src/features/Tools/pckDtbSearch.html",
    requiresPassword: true,
    parent: "#Tools",
    isPdf: false
  },

  "#pckDtbEdit": {
    path: "src/features/Tools/pckDtbEdit.html",
    requiresPassword: true,
    parent: "#Tools",
    isPdf: false
  }
};
