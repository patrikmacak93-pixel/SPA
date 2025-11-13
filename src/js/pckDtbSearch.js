(function () {
  const DATA_URL = "https://10.212.32.39:1884/search_pckDtb";

  function pckDtbSearchInit() {
    console.log("pckDtbSearchInit: start");

    const state = {
      allTableData: [],
      filteredData: [],
      currentPage: 1,
      itemsPerPage: 10,
      columnFilters: {},
      tableHeaders: [],
    };

    const dom = {
      headerRow: document.getElementById("pck-header-row"),
      filterRow: document.getElementById("pck-filter-row"),
      body: document.getElementById("pck-body"),
      exportBtn: document.getElementById("pck-export-btn"),
      prevBtn: document.getElementById("pck-prev-page"),
      nextBtn: document.getElementById("pck-next-page"),
      pageInfo: document.getElementById("pck-page-info"),
      itemsPerPageSel: document.getElementById("pck-items-per-page"),
    };

    // Když se init zavolá dřív, než je HTML v DOMu
    if (!dom.headerRow || !dom.body) {
      console.warn("pckDtbSearchInit: HTML prvky nebyly nalezeny.");
      return;
    }

    function totalPages() {
      return Math.max(
        1,
        Math.ceil(state.filteredData.length / state.itemsPerPage)
      );
    }

    function paginatedData() {
      const startIndex = (state.currentPage - 1) * state.itemsPerPage;
      return state.filteredData.slice(
        startIndex,
        startIndex + state.itemsPerPage
      );
    }

    function renderTableBody() {
      dom.body.innerHTML = "";
      const rows = paginatedData();
      rows.forEach((row) => {
        const tr = document.createElement("tr");
        state.tableHeaders.forEach((key) => {
          const td = document.createElement("td");
          const html = formatCellValue(row[key], key);
          td.innerHTML = html;
          if (isCentered(key)) td.classList.add("centered");
          tr.appendChild(td);
        });
        dom.body.appendChild(tr);
      });
    }

    function renderPagination() {
      dom.pageInfo.textContent = `${state.currentPage} / ${totalPages()} (rows: ${state.filteredData.length})`;
    }

    function applyFiltersAndRender() {
      let data = state.allTableData;
      for (const col of state.tableHeaders) {
        const val = (state.columnFilters[col] || "").toLowerCase();
        if (val) {
          data = data.filter((row) => {
            const cell = (
              row[col] == null ? "" : String(row[col])
            ).toLowerCase();
            return cell.includes(val);
          });
        }
      }
      state.filteredData = data;
      state.currentPage = 1;
      renderTableBody();
      renderPagination();
    }

    function prevPage() {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTableBody();
        renderPagination();
      }
    }

    function nextPage() {
      if (state.currentPage < totalPages()) {
        state.currentPage++;
        renderTableBody();
        renderPagination();
      }
    }

    function exportToCSV() {
      const data = state.filteredData;
      if (!data.length) {
        alert("Žádná data k exportu.");
        return;
      }

      const headers = state.tableHeaders;
      const replacer = (key, value) => (value == null ? "" : value);
      const rows = data.map((row) =>
        headers.map((h) => String(replacer(h, row[h])).replace(/"/g, '""'))
      );

      // první řádek pro Excel, aby věděl, že oddělovač je středník
      const sepLine = "sep=;";
      const headerLine = headers.join(";");
      const csvLines = rows.map((r) => r.map((cell) => `"${cell}"`).join(";"));
      const csvContent = [sepLine, headerLine, ...csvLines].join("\r\n");

      // přidat BOM pro lepší rozpoznání UTF-8 v Excelu (Windows)
      const BOM = "\uFEFF";
      const blob = new Blob([BOM + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "pck_filtered_data.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    function formatCellValue(value, key) {
      if (value == null) return "";
      let v = String(value);
      if (key === "PSDS" && v.startsWith("http")) {
        return `<button class="psds-button" onclick="window.open('${v}', '_blank')">Zobrazit PSDS</button>`;
      }
      if (v.startsWith("http")) {
        const filename = v.split("/").pop();
        return `<a href="${v}" target="_blank">${filename}</a>`;
      }
      if (v.includes(";")) return v.replace(/;/g, "<br/>");
      return v;
    }

    function isCentered(key) {
      return [
        "Record ID",
        "Project",
        "Part_number",
        "Part name",
        "Part weight (kg)",
        "Usage",
        "Supplier / Customer",
        "Part type",
        "Concept status",
        "P-pack description",
        "SAP ID P-pack",
        "Ownership P-pack",
        "Weight of empty P-pack",
        "Weight of full P-pack",
        "Lenght of P-pack",
        "Width of P-pack (mm)",
        "Height of P-pack (mm)",
        "Pcs /P-pack",
        "QTY of P-packs in layer on pallet",
        "QTY of layers on pallet",
        "P-pack lid name",
        "P-pack lid weight (kg)",
        "QTY of P-pack lids on pallet",
        "P-pack lid SAP no",
        "Type of p-pack",
        "P-pack RE / EX",
        "P-pack lid RE / EX",
        "Inner packaging name",
        "Inner packaging SAP no",
        "Empty inner packaging weight (kg)",
        "Full inner packaging weight (kg)",
        "Inner packaging lenght (mm)",
        "Inner packaging width (mm)",
        "Inner packaging height (mm)",
        "Pcs /Inner packaging",
        "QTY of inner packaging inside P-pack",
        "QTY of layers of inner packaging inside P-pack",
        "Description of other packaging materials inside P-pack",
        "Type of inner packaging",
        "Inner packaging ownership",
        "Inner packaging RE / EX",
        "Pallet SAP no",
        "Pallet name",
        "Empty pallet weight (kg)",
        "Pallet lenght (mm)",
        "Pallet width (mm)",
        "Height of empty pallet (mm)",
        "Height of full pallet (mm)",
        "Pallet lid SAP no",
        "Pallet lid weight (kg)",
        "Pallet RE / EX",
        "Pallet lid RE / EX",
        "PSDS",
      ].includes(key);
    }

    async function loadData() {
      try {
        console.log("pckDtbSearch: fetch ->", DATA_URL);
        const res = await fetch(DATA_URL);
        if (!res.ok) {
          console.error("pckDtbSearch: HTTP error", res.status, res.statusText);
          dom.body.innerHTML =
            "<tr><td colspan='10'>Chyba při načítání dat.</td></tr>";
          return;
        }
        const data = await res.json();
        console.log("pckDtbSearch: data loaded, rows:", data.length);

        if (!Array.isArray(data) || !data.length) {
          dom.body.innerHTML = "<tr><td colspan='10'>Žádná data.</td></tr>";
          return;
        }

        state.allTableData = data;
        state.tableHeaders = Object.keys(data[0]);

        renderHeaders();
        applyFiltersAndRender();
      } catch (err) {
        console.error("pckDtbSearch: fetch error", err);
        dom.body.innerHTML =
          "<tr><td colspan='10'>Chyba při načítání dat.</td></tr>";
      }
    }

    function renderHeaders() {
      dom.headerRow.innerHTML = "";
      dom.filterRow.innerHTML = "";
      state.tableHeaders.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col;
        dom.headerRow.appendChild(th);

        const filterTh = document.createElement("th");
        const input = document.createElement("input");
        input.className = "pck-filter-input";
        input.placeholder = "filter…";
        input.addEventListener("input", (e) => {
          state.columnFilters[col] = e.target.value;
          state.currentPage = 1;
          applyFiltersAndRender();
        });
        filterTh.appendChild(input);
        dom.filterRow.appendChild(filterTh);
      });
    }

    function initEvents() {
      dom.prevBtn.addEventListener("click", prevPage);
      dom.nextBtn.addEventListener("click", nextPage);
      dom.exportBtn.addEventListener("click", exportToCSV);
      dom.itemsPerPageSel.addEventListener("change", (e) => {
        state.itemsPerPage = parseInt(e.target.value, 10);
        state.currentPage = 1;
        renderTableBody();
        renderPagination();
      });
    }

    initEvents();
    loadData();
  }

  // zpřístupníme init funkci globálně
  window.pckDtbSearchInit = pckDtbSearchInit;
})();
