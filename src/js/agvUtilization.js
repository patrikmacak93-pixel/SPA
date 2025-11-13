// src/js/agvUtilization.js

(function () {
  console.log("agvUtilization.js loaded");

  // Stejný styl jako ostatní API v projektu
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
    SumFailureStatus: "Failure",
  };

  let pieChart = null;

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
      canvas: document.getElementById("agv-pie-canvas"),
      legendEl: document.getElementById("agv-legend"),
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
      .filter((e) => e.value > 0);

    if (entries.length === 0) {
      Object.entries(obj)
        .filter(([k]) => k.startsWith("Sum"))
        .forEach(([k, v]) =>
          entries.push({ key: k, value: Number(v) || 0 }),
        );
    }

    const labels = entries.map((e) => LABEL_MAP[e.key] || e.key);
    const data = entries.map((e) => e.value);
    return { labels, data };
  }

  function renderPie(canvas, labels, data) {
    if (!canvas) {
      console.warn("AGV: canvas not found");
      return;
    }

    if (typeof Chart === "undefined") {
      console.error(
        "AGV: Chart.js není načtený – chybí <script src=\"...chart.umd.min.js\"> v index.html?",
      );
      return;
    }

    if (pieChart) {
      pieChart.data.labels = labels;
      pieChart.data.datasets[0].data = data;
      pieChart.update();
      return;
    }

    const ctx = canvas.getContext("2d");
    pieChart = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "right",
            labels: {
              boxWidth: 14,
              padding: 8,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const value = context.parsed;
                const total =
                  context.chart._metasets[context.datasetIndex].total;
                const pct = total
                  ? ((value / total) * 100).toFixed(1) + "%"
                  : "";
                return `${context.label}: ${value} (${pct})`;
              },
            },
          },
        },
      },
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
      const pct = total ? ((data[i] / total) * 100).toFixed(1) + "%" : "0%";
      li.textContent = `${label}: ${data[i]} (${pct})`;
      ul.appendChild(li);
    });

    legendEl.appendChild(ul);
  }

  async function queryAgv(vehicleName) {
    const { root, statusEl, canvas, legendEl } = getElements();
    if (!root) {
      console.warn(
        "AGV: queryAgv zavolán, ale #agvUtilization není v DOM (pravděpodobně jiná route).",
      );
      return;
    }

    if (statusEl)
      statusEl.textContent = `Loading KPI for ${vehicleName}...`;
    console.log("AGV: sending request for", vehicleName);

    try {
      const res = await fetch(KPI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vehicle: vehicleName }),
      });

      console.log("AGV: response status", res.status, res.statusText);

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.error("AGV: response is not valid JSON:", e, text);
        if (statusEl)
          statusEl.textContent = "Error: response is not valid JSON.";
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
      console.error("AGV: fetch error", err);
      if (statusEl) statusEl.textContent = `Fetch error: ${err.message}`;
    }
  }

  // Globální delegovaný listener – funguje s tvým routerem
  document.addEventListener("click", function (ev) {
    const btn = ev.target.closest("[data-agv-vehicle]");
    if (!btn) return;

    const vehicleName =
      btn.dataset.agvVehicle || btn.textContent.trim() || "Friederike";

    ev.preventDefault();
    console.log("AGV button clicked:", vehicleName);
    queryAgv(vehicleName);
  });
})();
