// ==============================
//  IMPORTS
// ==============================

import { getImage, extractPlatformLinks, getStatusClass, getStatusLabel } from "./items.logic.js";

// ==============================
//  GENERIC HELPERS
// ==============================

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.innerText = value;
}

function setColor(el, value) {
  if (!el) return;

  if (value > 0) el.style.color = "#16a34a";
  else if (value < 0) el.style.color = "#dc2626";
  else el.style.color = "#e2e8f0";
}

function getDaysColor(days) {
  if (days > 14) return "#dc2626";
  if (days > 7) return "#f59e0b";
  return "#22c55e";
}

// ==============================
//  STATS
// ==============================

export function renderInventoryStats(stats) {
  setText("totalItems", stats.totalItems);
  setText("soldItems", stats.soldItems);

  const totalProfitEl = document.getElementById("totalProfit");
  const potentialProfitEl = document.getElementById("potentialProfit");

  if (totalProfitEl) {
    totalProfitEl.innerText = stats.totalProfit.toFixed(2) + " €";
    setColor(totalProfitEl, stats.totalProfit);
  }

  if (potentialProfitEl) {
    potentialProfitEl.innerText = stats.potentialProfit.toFixed(2) + " €";
    setColor(potentialProfitEl, stats.potentialProfit);
  }
}

// ==============================
//  TABLE RENDERING
// ==============================

export function renderTableUI(items, PLATFORMS, helpers, filters) {

  const { searchQuery, statusFilter } = filters;
  const { formatDate, getDaysSince } = helpers;

  const tableBody = document.getElementById("tableBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  const filteredItems = items.filter(item => {

    if (statusFilter && item.status !== statusFilter) return false;

    if (searchQuery) {
      const title = item.platformData?.wallapop?.title || "";
      if (!title.toLowerCase().includes(searchQuery)) return false;
    }

    return true;
  });

  filteredItems.forEach((item, index) => {

    // Extract platform links from TXT data
    // Use links directly from DB (DO NOT override)
    const links = typeof item.links === "object" && item.links !== null
      ? item.links
      : {};

    const selected =
      item.status === "Vendido"
        ? item.soldPlatform || item.selectedPlatform || "wallapop"
        : item.selectedPlatform || "wallapop";

    const data = item.platformData?.[selected] || {};

    // Platform-specific financial data
    const buy = data.buy ?? 0;
    const price = data.price ?? 0;
    const fees = data.fees ?? item.fees ?? 0;
    const profit = price - buy - fees;

    const row = document.createElement("tr");

    // Row background
    row.classList.add(getStatusClass(item.status));

    // Calculate days since published
    let days = "-";

    if (item.status === "Vendido" && item.datePublished && item.dateSold) {
      const start = new Date(item.datePublished);
      const end = new Date(item.dateSold);

      days = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    }

    // Generate "Vendido en" options based on active platforms
    const soldPlatformOptions = Object.keys(PLATFORMS)
      .filter(platform => item.links?.[platform]) // Only platforms with links
      .map(platform => {
        const name = PLATFORMS[platform].name;
        const selected =
          item.soldPlatform === platform ? "selected" : "";
        return `<option value="${platform}" ${selected}>${name}</option>`;
      })
      .join("");

    // Platform icons with link and active state
    const platformControls = Object.keys(PLATFORMS).map(p => {
      const config = PLATFORMS[p];
      const link = links[p] || "";
      const activePlatform =
        item.status === "Vendido"
          ? item.soldPlatform || item.selectedPlatform || "wallapop"
          : item.selectedPlatform || "wallapop";

      const isActive = activePlatform === p;
      const isAvailable = !!link;

      return `
        <div class="platform-icon-wrapper">
          <a href="${link || 'javascript:void(0)'}"
            target="_blank"
            onclick="event.stopPropagation(); ${!link ? 'return false;' : ''}">
            <img src="${config.icon}"
              title="${config.name}"
              class="platform-icon ${isActive ? 'active' : ''} ${isAvailable ? 'available' : 'inactive'}"
              style="opacity:${isAvailable ? "1" : "0.4"};
                      filter:${isAvailable ? "none" : "grayscale(100%)"};
                      cursor:${isAvailable ? "pointer" : "not-allowed"};"
              onclick="event.stopPropagation(); switchPlatform('${item.id}', '${p}')">
          </a>
        </div>
      `;
    }).join("");

    row.innerHTML = `
      
      <td class="item-id">${item.custom_id || "-"}</td>

      <td>
        <img src="${getImage(item)}"
          onclick="openImageViewerFromIndex(${items.indexOf(item)})"
          style="cursor:pointer;width:50px;height:50px;object-fit:cover;border-radius:6px;">
      </td>

      <td>
        ${data.title || ""}
        <div class="status-badge">
          ${getStatusLabel(item.status)}
        </div>
      </td>

      <td>
        ${(data.description || "").length > 40
        ? data.description.slice(0, 40) + "..."
        : data.description || ""}
      </td>

      <td class="nowrap col-sale">${price.toFixed(2)} €</td>
      <td class="nowrap col-buy">${buy.toFixed(2)} €</td>
      
      <td class="nowrap col-fees" style="color:#f59e0b">
        ${fees.toFixed(2)} €
      </td>
      <td class="nowrap col-profit"
          style="color:${profit > 0 ? "#16a34a" : "#dc2626"}">
        ${profit.toFixed(2)} €
      </td>

      <td>
        <select onchange="updateStatus('${item.id}', this.value)">
          <option ${item.status === "Disponible" ? "selected" : ""}>Disponible</option>
          <option ${item.status === "Reservado" ? "selected" : ""}>Reservado</option>
          <option ${item.status === "Vendido" ? "selected" : ""}>Vendido</option>
        </select>
      </td>

      <td class="platform-cell">
        <div class="platform-icons">
          ${platformControls}
        </div>
      </td>

      <td class="select-cell">
        <select 
          onchange="updateSoldPlatform('${item.id}', this.value)"
          ${item.status !== "Vendido" ? "disabled" : ""}
        >
          <option value="">Seleccionar</option>
          ${soldPlatformOptions}
        </select>
      </td>

      <td class="date-cell">${formatDate(item.datePublished)}</td>

      <td class="date-cell" style="
        color: ${getDaysColor(days)};
        font-weight: bold;
      ">
        ${days}
      </td>

      <td class="date-cell">${formatDate(item.dateSold)}</td>

      <td class="actions-cell">
        <button class="action-btn edit" title="Edit" onclick="editItem('${item.id}')">
          <i data-lucide="pencil"></i>
        </button>

        <button class="action-btn delete" title="Delete" onclick="deleteItem('${item.id}')">
          <i data-lucide="trash-2"></i>
        </button>

        <button class="action-btn upload" title="Upload Images" onclick="uploadImagesForItem('${item.id}')">
          <i data-lucide="image-plus"></i>
        </button>
      </td>
    `;

    // Toggle platform when clicking on the row
    row.style.cursor = "pointer";

    row.addEventListener("click", (e) => {
      // Prevent clicking on buttons, selects, icons, etc.
      if (e.target.closest("select, img, button, a")) return;

      // Do not allow switching if sold
      if (item.status === "Vendido") return;

      const platforms = Object.keys(PLATFORMS);

      const currentIndex = platforms.indexOf(
        item.selectedPlatform || "wallapop"
      );

      const nextPlatform =
        platforms[(currentIndex + 1) % platforms.length];

      window.switchPlatform(item.id, nextPlatform);
    });

    tableBody.appendChild(row);
  });
}

// ==============================
//  MOBILE CARD RENDERING
// ==============================

export function renderMobileCards(items) {
  const container = document.getElementById("itemsContainer");

  if (!container) return;

  container.innerHTML = items.map((item, index) => {

    const selected =
      item.status === "Vendido"
        ? item.soldPlatform || item.selectedPlatform || "wallapop"
        : item.selectedPlatform || "wallapop";

    const data = item.platformData?.[selected] || {};

    const buy = data.buy ?? 0;
    const price = data.price ?? 0;
    const fees = data.fees ?? 0;
    const profit = price - buy - fees;

    return `
      <div class="item-card ${getStatusClass(item.status)}">

        <div class="card-id">${item.custom_id || "-"}</div>
        
        <!-- IMAGE -->
        <div class="card-image">
          <img src="${getImage(item)}" class="card-img">
          ${item.images?.length > 1 ? `<div class="image-count">+${item.images.length - 1}</div>` : ""}
        </div>

        <!-- PLATFORM SWITCHER -->
        <div class="card-platform" onclick="event.stopPropagation()">

          <button class="arrow-btn" onclick="switchPlatform('${item.id}', 'prev')">←</button>

          <div class="platform-center">
            <span class="platform-label ${selected}">
              ${selected}
            </span>
          </div>

          <button class="arrow-btn" onclick="switchPlatform('${item.id}', 'next')">→</button>

        </div>

        <div class="card-status">
          <span class="status-badge">
            ${getStatusLabel(item.status)}
          </span>
        </div>

        <!-- TITLE -->
        <div class="card-title">
          ${data.title || ""}
        </div>

        <!-- PRICES -->
        <div class="card-prices">
          <div class="row">
            <span>Venta</span>
            <span>${price.toFixed(2)} €</span>
          </div>
          <div class="row">
            <span>Compra</span>
            <span>${buy.toFixed(2)} €</span>
          </div>
          <div class="row">
            <span>Comisión</span>
            <span>${fees.toFixed(2)} €</span>
          </div>

          <div class="profit ${profit >= 0 ? "pos" : "neg"}">
            ${profit >= 0 ? "+" : ""}${profit.toFixed(2)} €
          </div>
        </div>

        <!-- CONTROLS -->
        <div class="card-controls" onclick="event.stopPropagation()">
          <select onchange="updateStatus('${item.id}', this.value)">
            <option ${item.status === "Disponible" ? "selected" : ""}>Disponible</option>
            <option ${item.status === "Reservado" ? "selected" : ""}>Reservado</option>
            <option ${item.status === "Vendido" ? "selected" : ""}>Vendido</option>
          </select>

          <select onchange="updateSoldPlatform('${item.id}', this.value)">
            <option value="">-</option>
            <option value="wallapop" ${item.soldPlatform === "wallapop" ? "selected" : ""}>Wallapop</option>
            <option value="vinted" ${item.soldPlatform === "vinted" ? "selected" : ""}>Vinted</option>
            <option value="milanuncios" ${item.soldPlatform === "milanuncios" ? "selected" : ""}>Milanuncios</option>
          </select>
        </div>

        <!-- META -->
        <div class="card-meta">
          <span>📅 ${item.datePublished || "-"}</span>
          <span>⏱ ${item.datePublished && item.dateSold
        ? Math.floor((new Date(item.dateSold) - new Date(item.datePublished)) / (1000 * 60 * 60 * 24))
        : "-"
      }</span>
        </div>

        <!-- ACTIONS -->
        <div class="card-actions" onclick="event.stopPropagation()">

          <button class="btn edit" onclick="editItem('${item.id}')">
            ✏️ Editar
          </button>

          <button class="btn delete" onclick="deleteItem('${item.id}')">
            🗑 Eliminar
          </button>

          <button 
            class="btn link ${item.links?.[selected] ? "" : "disabled"}"
            ${item.links?.[selected] ? `onclick="window.open('${item.links[selected]}', '_blank')"` : ""}
          >
            ${item.links?.[selected] ? "🔗 Link" : "🔒 No Link"}
          </button>

        </div>

      </div>
    `;
  }).join("");
}

// ==============================
//  SALES GALLERY
// ==============================

export function renderSalesGallery(items, helpers) {
  const container = document.getElementById("salesContainer");
  if (!container) return;

  const { formatDate, getDaysSince } = helpers;

  const soldItems = items.filter(i => i.status === "Vendido");

  if (soldItems.length === 0) {
    container.innerHTML = "<p>No hay ventas todavía</p>";
    return;
  }

  container.innerHTML = soldItems.map(item => {

    const data = item.platformData?.[item.selectedPlatform || "wallapop"] || {};
    const days = item.datePublished && item.dateSold
      ? Math.ceil((new Date(item.dateSold) - new Date(item.datePublished)) / (1000 * 60 * 60 * 24))
      : "-";

    return `
      <div class="sale-card">
        <img src="${item.image || 'Images/no-image.jpg'}">

        <h3>${data.title || "Sin título"}</h3>

        <p>Compra: ${(data.buy ?? 0).toFixed(2)} €</p>
        <p>Venta: ${(data.price ?? 0).toFixed(2)} €</p>
        <p class="profit">
          +${((data.price ?? 0) - (data.buy ?? item.buy ?? 0) - (data.fees ?? item.fees ?? 0)).toFixed(2)} €
        </p>

        <small>
          ${days} días · ${item.soldPlatform || "-"}
        </small>
      </div>
    `;
  }).join("");
}