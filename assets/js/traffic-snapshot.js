(function () {
  "use strict";

  const DATA = window.TRAFFIC_SNAPSHOT;
  if (!DATA) return;

  const root = document.getElementById("traffic");
  if (!root) return;

  const fmt = (n) =>
    n == null || n === "" ? "-" : Number(n).toLocaleString("ru-RU");
  const pct = (part, whole) =>
    whole ? ((part / whole) * 100).toFixed(1).replace(".", ",") + "%" : "-";
  const delta = (a, b) => (b == null || a == null ? null : b - a);
  const deltaPct = (a, b) =>
    a == null || b == null || a === 0 ? null : (((b - a) / a) * 100).toFixed(0);

  function structureXlsxFor(sheet) {
    return (
      structureCache?.exports?.[sheet] ||
      DATA.structureExports?.[sheet] ||
      `./assets/exports/${sheet}_pages.xlsx`
    );
  }

  function resolveExportUrl(sheet) {
    return new URL(structureXlsxFor(sheet), window.location.href).href;
  }

  let structureCache = null;

  async function downloadStructureXlsx(sheet, event) {
    event?.preventDefault();
    const filename = `${sheet}_pages.xlsx`;
    const url = resolveExportUrl(sheet);

    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      return;
    } catch {
      /* fetch недоступен (file://) - пробуем прямую ссылку */
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  let chartsReady = false;
  let chartInstances = [];

  function favicon(domain) {
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
  }

  function formatSummaryValue(value) {
    if (!value.includes(" / ")) return value;
    const [fact, goal] = value.split(" / ");
    return `<span class="traffic-summary__metric"><span class="traffic-summary__metric-fact">${fact}</span><span class="traffic-summary__metric-sep">/</span><span class="traffic-summary__metric-goal">${goal}</span></span>`;
  }

  function renderVerdict() {
    const g = DATA.goals;
    const cur = DATA.domains.find((d) => d.ours).september;
    const el = document.getElementById("ts-verdict");
    if (!el) return;

    const items = [
      {
        cls: "cf-summary__item--gap",
        value: `${fmt(cur.traffic)} / ${fmt(Math.round(g.traffic))}`,
        label: "Трафик в день · факт / цель",
        hint: `Выполнение ${pct(cur.traffic, g.traffic)}`,
      },
      {
        cls: "cf-summary__item--gap",
        value: `${fmt(cur.pages)} / ${fmt(Math.round(g.pages))}`,
        label: "Страниц в выдаче · факт / цель",
        hint: `Выполнение ${pct(cur.pages, g.pages)}`,
      },
      {
        cls: "cf-summary__item--gap",
        value: `${fmt(cur.top10)} / ${fmt(Math.round(g.top10))}`,
        label: "Запросов в ТОП-10 · факт / цель",
        hint: `Выполнение ${pct(cur.top10, g.top10)}`,
      },
      {
        cls: "cf-summary__item--conflict",
        value: "4 мес.",
        label: "Без роста трафика",
        hint: "29.04.2026 -> 01.09.2026",
      },
    ];

    el.innerHTML = items
      .map(
        (i) => `
      <div class="cf-summary__item ${i.cls}">
        <span class="cf-summary__value">${formatSummaryValue(i.value)}</span>
        <span class="cf-summary__label">${i.label}</span>
        <span class="traffic-summary__hint">${i.hint}</span>
      </div>`
      )
      .join("");
  }

  function renderGoalBars() {
    const g = DATA.goals;
    const cur = DATA.domains.find((d) => d.ours).september;
    const metrics = [
      { key: "traffic", label: "Трафик в день" },
      { key: "pages", label: "Страниц в выдаче" },
      { key: "top1", label: "ТОП-1" },
      { key: "top10", label: "ТОП-10" },
    ];
    const el = document.getElementById("ts-goal-bars");
    if (!el) return;

    el.innerHTML = metrics
      .map((m) => {
        const goal = g[m.key];
        const val = cur[m.key];
        const width = Math.max(1, Math.min(100, (val / goal) * 100));
        return `
        <div class="traffic-goal-bar">
          <div class="traffic-goal-bar__labels">
            <span>${m.label}</span>
            <span>${fmt(val)} / ${fmt(Math.round(goal))} (${pct(val, goal)})</span>
          </div>
          <div class="traffic-goal-bar__track">
            <div class="traffic-goal-bar__fill" style="width:${width}%"></div>
          </div>
        </div>`;
      })
      .join("");
  }

  function renderComparisonTable() {
    const ours = DATA.domains.find((d) => d.ours);
    const tbody = document.querySelector("#ts-compare-table tbody");
    if (!tbody) return;

    const rows = [
      ["Трафик в день", "traffic"],
      ["Страниц в выдаче", "pages"],
      ["ТОП-1", "top1"],
      ["ТОП-3", "top3"],
      ["ТОП-5", "top5"],
      ["ТОП-10", "top10"],
      ["ТОП-50", "top50"],
      ["Входящие ссылки", "backlinks"],
    ];

    tbody.innerHTML = rows
      .map(([label, key]) => {
        const a = ours.april[key];
        const s = ours.september[key];
        const g = DATA.goals[key];
        return `<tr>
          <td>${label}</td>
          <td>${fmt(a)}</td>
          <td>${fmt(s)}</td>
          <td>${g != null ? fmt(Math.round(g)) : "-"}</td>
          <td>${g != null && s != null ? pct(s, g) : "-"}</td>
        </tr>`;
      })
      .join("");
  }

  function metricDeltaHtml(april, sept) {
    if (april == null || sept == null) return "";
    const d = delta(april, sept);
    if (d === 0) return '<div class="traffic-card-metric__delta traffic-delta--flat">без изменений</div>';
    const cls = d > 0 ? "traffic-delta--up" : "traffic-delta--down";
    const dp = deltaPct(april, sept);
    return `<div class="traffic-card-metric__delta ${cls}">${d > 0 ? "+" : ""}${fmt(d)}${dp != null ? ` (${dp > 0 ? "+" : ""}${dp}%)` : ""}</div>`;
  }

  function renderCards() {
    const el = document.getElementById("ts-competitor-cards");
    if (!el) return;

    el.innerHTML = DATA.domains
      .map((d) => {
        const s = d.september || {};
        const a = d.april || {};
        const sheetKey = d.sheet || d.domain.replace(/^www\./, "");
        const pagesApr = d.aprilCrawled;
        const pagesSep = d.septCrawled ?? DATA.structureTotals?.[sheetKey] ?? null;
        const metrics = d.ours
          ? [
              ["Трафик в день", s.traffic, a.traffic],
              ["Страниц в выдаче", s.pages, a.pages],
              ["ТОП-1", s.top1, a.top1],
              ["ТОП-10", s.top10, a.top10],
              ["Ссылки", s.backlinks, a.backlinks],
              ["Страниц на сайте", pagesSep, pagesApr],
            ]
          : [
              ["Трафик в день", s.traffic, null],
              ["Страниц в выдаче", s.pages, null],
              ["ТОП-1", s.top1, null],
              ["ТОП-10", s.top10, null],
              ["Ссылки", s.backlinks, a.backlinks],
              ["Страниц на сайте", pagesSep, pagesApr],
            ];
        const hasStructure =
          DATA.structureTotals && sheetKey in DATA.structureTotals;

        return `
        <article class="traffic-card${d.ours ? " traffic-card--ours" : ""}">
          <div class="traffic-card__head">
            <img class="traffic-card__favicon" src="${favicon(d.domain)}" alt="" width="32" height="32" loading="lazy">
            <h4 class="traffic-card__title">${d.domain}</h4>
            ${d.ours ? '<span class="traffic-card__badge">ваш сайт</span>' : ""}
          </div>
          <div class="traffic-card__metrics">
            ${metrics
              .map(([label, val, apr]) => {
                const show = val != null ? val : apr;
                if (show == null && apr == null) return "";
                return `
              <div class="traffic-card-metric">
                <span class="traffic-card-metric__label">${label}</span>
                <span class="traffic-card-metric__val">${fmt(show)}</span>
                ${!d.ours && apr != null && val != null ? metricDeltaHtml(apr, val) : ""}
              </div>`;
              })
              .join("")}
          </div>
          ${
            hasStructure
              ? `<div class="traffic-card__foot">
              <button type="button" class="button button--primary ts-structure-open" data-sheet="${sheetKey}">
                <i class="fa-solid fa-sitemap" aria-hidden="true"></i> Структура сайта (${fmt(DATA.structureTotals[sheetKey])} стр.)
              </button>
            </div>`
              : ""
          }
        </article>`;
      })
      .join("");

    el.querySelectorAll(".ts-structure-open").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await loadStructure();
        downloadStructureXlsx(btn.dataset.sheet);
      });
    });
  }

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 12 } } },
    },
  };

  function isNarrowChart() {
    return window.innerWidth < 640;
  }

  function axisTickLabel(v) {
    if (!isNarrowChart()) return fmt(v);
    if (v >= 1000) {
      const thousands = v / 1000;
      return Number.isInteger(thousands) ? `${thousands} тыс` : `${thousands.toFixed(1)} тыс`;
    }
    return String(v);
  }

  function buildLogTicks(max) {
    const all = [];
    for (let exp = 0, v = 1; v <= max * 1.2; exp++, v = Math.pow(10, exp)) {
      all.push({ value: v });
    }
    if (isNarrowChart()) {
      if (all.length <= 3) return all;
      const last = all.length - 1;
      const mid = Math.round(last / 2);
      return [all[0], all[mid], all[last]];
    }
    if (all.length <= 5) return all;

    const picked = [all[0]];
    const step = Math.max(1, Math.floor((all.length - 1) / 4));
    for (let i = step; i < all.length - 1; i += step) {
      picked.push(all[i]);
    }
    if (picked[picked.length - 1] !== all[all.length - 1]) {
      picked.push(all[all.length - 1]);
    }
    return picked;
  }

  const logScaleX = (maxHint) => ({
    type: "logarithmic",
    min: 1,
    afterBuildTicks: (scale) => {
      scale.ticks = buildLogTicks(maxHint || scale.max);
    },
    ticks: {
      autoSkip: false,
      maxRotation: 0,
      minRotation: 0,
      padding: 10,
      font: { size: 11 },
      callback: (v) => axisTickLabel(v),
    },
    grid: {
      drawOnChartArea: true,
    },
  });

  function refreshCharts() {
    chartInstances.forEach((c) => {
      try {
        const xScale = c.scales?.x;
        if (xScale?.options?.afterBuildTicks) {
          xScale.options.afterBuildTicks(xScale);
        }
        c.update("none");
        c.resize();
      } catch {
        /* ignore */
      }
    });
  }

  function resizeCharts() {
    refreshCharts();
  }

  function initCharts() {
    if (typeof Chart === "undefined") return false;

    const goalsEl = document.getElementById("chart-goals");
    if (!goalsEl || goalsEl.dataset.chartReady === "1") {
      return chartsReady;
    }

    const ours = DATA.domains.find((d) => d.ours);
    const competitors = DATA.domains.filter((d) => !d.ours);

    try {
      chartInstances.push(
        new Chart(goalsEl, {
          type: "bar",
          data: {
            labels: ["Трафик", "Страницы", "ТОП-1", "ТОП-10"],
            datasets: [
              {
                label: "Сейчас",
                data: ["traffic", "pages", "top1", "top10"].map((k) =>
                  Math.max(ours.september[k] || 0, 1)
                ),
                backgroundColor: "#b94444",
              },
              {
                label: "Цель",
                data: ["traffic", "pages", "top1", "top10"].map((k) => DATA.goals[k]),
                backgroundColor: "#1a7fc4",
              },
            ],
          },
          options: {
            ...chartDefaults,
            indexAxis: "y",
            layout: {
              padding: {
                left: 0,
                right: 8,
                bottom: 20,
                top: 4,
              },
            },
            plugins: {
              legend: {
                position: "bottom",
                align: "start",
                labels: {
                  boxWidth: 12,
                  padding: 12,
                  font: { size: 12 },
                },
              },
            },
            scales: {
              x: logScaleX(Math.max(...Object.values(DATA.goals))),
            },
          },
        })
      );
    } catch (e) {
      console.error("chart-goals", e);
    }

    const progressEl = document.getElementById("chart-ours-progress");
    if (progressEl) {
      try {
        chartInstances.push(
          new Chart(progressEl, {
        type: "line",
        data: {
          labels: ["ТОП-1", "ТОП-3", "ТОП-5", "ТОП-10", "ТОП-50", "Страницы"],
          datasets: [
            {
              label: "29.04.2026",
              data: ["top1", "top3", "top5", "top10", "top50", "pages"].map(
                (k) => ours.april[k]
              ),
              borderColor: "#94a3b8",
              backgroundColor: "rgba(148,163,184,0.12)",
              fill: true,
              tension: 0.25,
            },
            {
              label: "01.09.2026",
              data: ["top1", "top3", "top5", "top10", "top50", "pages"].map(
                (k) => ours.september[k]
              ),
              borderColor: "#1a7fc4",
              backgroundColor: "rgba(26,127,196,0.1)",
              fill: true,
              tension: 0.25,
            },
            {
              label: "Цель",
              data: [
                DATA.goals.top1,
                DATA.goals.top3,
                DATA.goals.top5,
                DATA.goals.top10,
                null,
                DATA.goals.pages,
              ],
              borderColor: "#1f6b45",
              borderDash: [6, 4],
              pointRadius: 3,
              fill: false,
              tension: 0.25,
            },
          ],
        },
        options: {
          ...chartDefaults,
          scales: { y: { beginAtZero: true } },
        },
      })
        );
      } catch (e) {
        console.error("chart-ours-progress", e);
      }
    }

    const trafficEl = document.getElementById("chart-traffic");
    if (trafficEl) {
      const trafficValues = DATA.domains.map((d) => d.september.traffic || 0);
      const maxTraffic = Math.max(...trafficValues);
      const trafficMax = Math.ceil(maxTraffic / 500) * 500 || maxTraffic;

      try {
        chartInstances.push(
          new Chart(trafficEl, {
        type: "bar",
        data: {
          labels: DATA.domains.map((d) => d.domain.replace("www.", "")),
          datasets: [
            {
              label: "Трафик в день",
              data: trafficValues,
              backgroundColor: DATA.domains.map((d) =>
                d.ours ? "#b94444" : "#5a6570"
              ),
              minBarLength: 14,
            },
          ],
        },
        options: {
          ...chartDefaults,
          indexAxis: "y",
          plugins: { legend: { display: false } },
          scales: {
            x: {
              beginAtZero: true,
              max: trafficMax,
              ticks: {
                callback: (v) => fmt(v),
                maxRotation: 0,
              },
            },
          },
        },
      })
        );
      } catch (e) {
        console.error("chart-traffic", e);
      }
    }

    const pagesEl = document.getElementById("chart-pages");
    if (pagesEl) {
      try {
        chartInstances.push(
          new Chart(pagesEl, {
        type: "bar",
        data: {
          labels: competitors.map((d) => d.domain.replace("www.", "")),
          datasets: [
            {
              label: "В выдаче",
              data: competitors.map((d) => d.september.pages),
              backgroundColor: "#1a7fc4",
            },
            {
              label: "На сайте",
              data: competitors.map((d) => d.septCrawled || 0),
              backgroundColor: "#c8d2dc",
            },
          ],
        },
        options: {
          ...chartDefaults,
          scales: { y: { beginAtZero: true } },
        },
      })
        );
      } catch (e) {
        console.error("chart-pages", e);
      }
    }

    goalsEl.dataset.chartReady = "1";
    chartsReady = true;
    resizeCharts();
    return true;
  }

  function ensureCharts() {
    if (initCharts()) {
      refreshCharts();
      return;
    }
    window.setTimeout(ensureCharts, 100);
  }

  function observeGoalsChart() {
    const goalsEl = document.getElementById("chart-goals");
    if (!goalsEl || goalsEl.dataset.observeReady === "1") return;
    goalsEl.dataset.observeReady = "1";

    const boot = () => {
      if (!chartsReady) ensureCharts();
      else refreshCharts();
    };

    if (!("IntersectionObserver" in window)) {
      boot();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0)) {
          window.setTimeout(boot, 60);
        }
      },
      { threshold: [0, 0.15, 0.5] }
    );

    observer.observe(goalsEl);
    window.setTimeout(boot, 300);
  }

  function bindReadMoreCharts() {
    const readMore = root.querySelector(".read-more");
    if (!readMore) return;

    const toggle = readMore.querySelector(".read-more__toggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      window.setTimeout(() => {
        if (!chartsReady) ensureCharts();
        else refreshCharts();
      }, 80);
      window.setTimeout(refreshCharts, 450);
    });
  }

  async function loadStructure() {
    if (structureCache) return structureCache;
    try {
      const res = await fetch("./assets/data/competitors-structure.json");
      if (!res.ok) throw new Error("fetch failed");
      structureCache = await res.json();
      DATA.structureTotals = structureCache.totals;
      DATA.structureExports = structureCache.exports;
    } catch {
      /* offline / file:// - кнопки структуры работают по inline totals */
    }
    return structureCache;
  }

  renderVerdict();
  renderGoalBars();
  renderComparisonTable();
  renderCards();
  bindReadMoreCharts();

  if (document.readyState === "complete") {
    observeGoalsChart();
  } else {
    window.addEventListener("load", observeGoalsChart, { once: true });
  }

  window.addEventListener("resize", () => {
    window.requestAnimationFrame(refreshCharts);
  });

  loadStructure().then(() => renderCards()).catch(() => {});
})();
