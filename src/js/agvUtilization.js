// src/js/agvUtilization.js
// Globální handler – funguje i když se #agvUtilization do DOM vloží až později.

(function () {
  console.log("agvUtilization.js loaded (global handler)");

  const KPI_URL = "https://10.212.32.39:1884/agv-kpi";

  const LABEL_MAP = {
    SumIdleStatus: "Idle",
    SumChargingStatus: "Charging",
    SumObstructionStatus: "Obstruction",
    SumPauseStatus: "Pause",
    SumActiveEmptyStatus: "Active (Empty)",
    SumActiveFullStatus: "Active (Full)",
    SumOfflineStatus: "Offline",
    SumManualStatus: "Manual",
    SumFailureStatus: "Failure"
  };

  let pieChart = null;

  // pokaždé si sáhneme do DOM – protože obsah se může dynamicky měnit
  function getElements() {
    const root = document.getElementById("agvUtilization");
    if (!root) {
      return {
        root: null,
        statusEl: null,
        canvas: null,
        legendEl: null,
      };
    }
    return {
      root,
      statusEl: root.querySelector("#agv-status"),
      canvas: root.querySelector("#agv-pie-canvas"),
      legendEl: root.querySelector("#agv-legend"),
    };
  }

  function transformResponseToPie(dataArray) {
    const obj = Array.isArray(dataArray) ? dataArray[0] : dataArray;
    if (!obj || typeof obj !== "object") return { labels: [], data: [] };

    const entries = Object.entries(obj)
      .filter(([k]) => k.startsWith("Sum"))
      .map(([k, v]) => {
        const num = Number(v);
        return { key: k, value: Number.isFinite(num) ? num : 0 };
      })
      .filter(e => e.value > 0);

    if (entries.length === 0) {
      Object.entries(obj)
        .filter(([k]) => k.startsWith("Sum"))
        .forEach(([k, v]) => entries.push({ key: k, value: Number(v) || 0 }));
    }

    const labels = entries.map(e => LABEL_MAP[e.key] || e.key);
    const data = entries.map(e => e.value);
    return { labels, data };
  }

  function renderPie(canvas, labels, data) {
    if (!canvas) {
      console.warn("renderPie: canvas not found");
      return;
    }

    if (pieChart) {
      pieChart.data.labels = labels;
      pieChart.data.datasets[0].data = data;
      pieChart.update();
      return;
    }

    if (typeof Chart === "undefined") {
      console.error("Chart.js not loaded – missing <script src=\"...chart.umd.min.js\">");
      return;
    }

    const ctx = canvas.getContext("2d");
    pieChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [{
          data,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "right",
            labels: {
              boxWidth: 14,
              padding: 8
            }
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const value = context.parsed;
                const total = context.chart._metasets[context.datasetIndex].total;
                const pct = total ? (value / total * 100).toFixed(1) + "%" : "";
                return `${context.label}: ${value} (${pct})`;
              }
            }
          }
        }
      }
    });
  }

  function renderLegend(legendEl, labels, data) {
    if (!legendEl) return;
    legendEl.innerHTML = "";
    if (!labels.length) return;

    const total = data.reduce((s, v) => s + v, 0);
    const ul = document.createElement("ul");
    ul.style.padding = "0";
    ul.style.margin = "0";
    ul.style.listStyle = "none";

    labels.forEach((label, i) => {
      const li = document.createElement("li");
      li.style.marginBottom = "6px";
      const pct = total ? (data[i] / total * 100).toFixed(1) + "%" : "0%";
      li.textContent = `${label}: ${data[i]} (${pct})`;
      ul.appendChild(li);
    });

    legendEl.appendChild(ul);
  }

  async function queryAgv(vehicleName) {
    const { root, statusEl, canvas, legendEl } = getElements();

    // pokud stránka #agvUtilization není zrovna v DOM, tak nic nedělej
    if (!root) {
      console.warn("queryAgv called, but #agvUtilization is not in DOM.");
      return;
    }

    if (statusEl) statusEl.textContent = `Loading KPI for ${vehicleName}...`;
    console.log("Sending KPI request for", vehicleName);

    try {
      const res = await fetch(KPI_URL, {
        method: "POST",
        mode: "cors",
        credentials: "include", // stejné chování jako u auth/pckDtb
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ vehicle: vehicleName })
      });

      console.log("KPI response status:", res.status, res.statusText);

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.error("Cannot parse KPI JSON:", e, "raw:", text);
        if (statusEl) statusEl.textContent = "Error: response is not valid JSON.";
        return;
      }

      const { labels, data } = transformResponseToPie(json);
      if (!labels.length) {
        if (statusEl) statusEl.textContent = `No KPI data for ${vehicleName}.`;
        renderPie(canvas, [], []);
        renderLegend(legendEl, [], []);
        return;
      }

      renderPie(canvas, labels, data);
      renderLegend(legendEl, labels, data);
      if (statusEl) statusEl.textContent = `Showing KPI for ${vehicleName}.`;
    } catch (err) {
      console.error("KPI fetch error:", err);
      if (statusEl) statusEl.textContent = `Fetch error: ${err.message}`;
    }
  }

  // 🔑 Globální delegovaný listener – funguje i když je tlačítko vložené dynamicky
  document.addEventListener("click", function (ev) {
    const btn = ev.target.closest("[data-agv-vehicle], #btn-Friederike");
    if (!btn) return;

    const vehicleName = btn.dataset.agvVehicle || btn.textContent.trim();
    if (!vehicleName) return;

    ev.preventDefault();
    console.log("AGV button clicked:", vehicleName);
    queryAgv(vehicleName);
  });
})();
