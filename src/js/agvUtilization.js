(() => {
  // CONFIG
  const KPI_URL = "https://10.212.32.39:1884/agv-kpi"; // endpoint

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

  // Elements (initialized after DOM ready)
  let statusEl, canvas, legendEl, pieChart;

  function initElements() {
    statusEl = document.getElementById("agv-status");
    canvas = document.getElementById("agv-pie-canvas");
    legendEl = document.getElementById("agv-legend");
  }

  // Transforms response into labels/data for Chart.js
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

    // If all were filtered (zeros), include zeros so chart shows categories with 0
    if (entries.length === 0) {
      Object.entries(obj)
        .filter(([k]) => k.startsWith("Sum"))
        .forEach(([k, v]) => entries.push({ key: k, value: Number(v) || 0 }));
    }

    const labels = entries.map((e) => LABEL_MAP[e.key] || e.key);
    const data = entries.map((e) => e.value);
    return { labels, data, rawEntries: entries };
  }

  // Render or update pie chart
  function renderPie(labels, data) {
    if (!canvas) return;

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
        labels: labels,
        datasets: [
          {
            data: data,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "right", labels: { boxWidth: 14, padding: 8 } },
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

  // Render legend (with absolute values)
  function renderLegend(labels, data) {
    if (!legendEl) return;
    legendEl.innerHTML = "";
    if (!labels || !labels.length) return;

    const total = data.reduce((s, v) => s + v, 0);
    const ul = document.createElement("ul");
    ul.style.padding = "0";
    ul.style.margin = "0";
    ul.style.listStyle = "none";

    for (let i = 0; i < labels.length; i++) {
      const li = document.createElement("li");
      li.style.marginBottom = "6px";
      const pct = total ? ((data[i] / total) * 100).toFixed(1) + "%" : "0%";
      li.textContent = `${labels[i]}: ${data[i]} (${pct})`;
      ul.appendChild(li);
    }

    legendEl.appendChild(ul);
  }

  // Query AGV KPI endpoint
  async function queryAgv(vehicleName) {
    if (!statusEl) return;
    statusEl.textContent = `Loading KPI for ${vehicleName}...`;

    try {
      const res = await fetch(KPI_URL, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicle: vehicleName }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

      const json = await res.json();
      const { labels, data } = transformResponseToPie(json);

      if (!labels.length) {
        statusEl.textContent = `No KPI data returned for ${vehicleName}.`;
        renderPie([], []);
        renderLegend([], []);
        return;
      }

      renderPie(labels, data);
      renderLegend(labels, data);
      statusEl.textContent = `Showing KPI for ${vehicleName}.`;
    } catch (err) {
      console.error("AGV KPI error:", err);
      statusEl.textContent = `Error fetching KPI: ${err.message}. Check CORS / TLS.`;
    }
  }

  // Attach event listeners for buttons inside #agv-buttons
  function wireButtons() {
    const buttonsContainer = document.getElementById("agv-buttons");
    if (!buttonsContainer) return;

    buttonsContainer.addEventListener("click", (ev) => {
      const btn = ev.target.closest("button");
      console.log(btn);
      if (!btn) return;
      const id = btn.id || "";
      // If button id follows pattern btn-<name> extract name, otherwise use textContent
      const match = id.match(/^btn-(.+)$/);
      const name = match
        ? decodeURIComponent(match[1])
        : btn.textContent.trim();
      if (name) queryAgv(name);
    });
  }

  // Initialize on DOM ready
  document.addEventListener("DOMContentLoaded", () => {
    initElements();
    wireButtons();
    // Optional: auto-load first AGV
    // const firstBtn = document.querySelector('#agv-buttons button');
    // if (firstBtn) firstBtn.click();
  });
})();
