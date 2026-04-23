/**
 * Extracts a section value from the TXT content.
 * @param {string} text
 * @param {string} tag
 * @returns {string}
 */
export function extractTag(text, tag) {
  const regex = new RegExp(
    `\\[${tag}\\]\\s*\\n*([\\s\\S]*?)(?=\\n\\s*\\[|$)`,
    "i"
  );

  const match = text.match(regex);

  return match ? match[1].trim() : "";
}

/**
 * Converts a price string like "50€" into a number.
 * @param {string} value
 * @returns {number}
 */
export function parsePrice(value) {
    if (!value) return 0;
    return parseFloat(
        value.replace("€", "").replace(",", ".").trim()
    ) || 0;
}

/**
 * Calculates profit.
 * Profit = Precio - Compra - Comisión
 */
export function calculateProfit(price, compra, comision) {
    return price - compra - comision;
}



// ==============================
//  DATA CALCULATION FUNCTIONS
// ==============================

export function calculateProfitValue(buy, sale, fees) {
  return sale - buy - fees;
}

export function calculateStats(items) {
  const totalItems = items.length;
  const soldItems = items.filter(i => i.status === "Vendido").length;

  const getPlatformProfit = (item) => {
    const platform =
      item.status === "Vendido"
        ? item.soldPlatform || item.selectedPlatform || "wallapop"
        : item.selectedPlatform || "wallapop";

    const data = item.platformData?.[platform];
    if (!data) return 0;

    return (
      (data.price || 0) -
      (data.buy || 0) -
      (data.fees || 0)
    );
  };

  const totalProfit = items.reduce((sum, item) => {
    return item.status === "Vendido"
      ? sum + getPlatformProfit(item)
      : sum;
  }, 0);

  const potentialProfit = items.reduce((sum, item) => {
    return item.status !== "Vendido"
      ? sum + getPlatformProfit(item)
      : sum;
  }, 0);

  return {
    totalItems,
    soldItems,
    totalProfit,
    potentialProfit
  };
}

// ==============================
//  INPUT EVENT SETUP
// ==============================

export function formatDate(dateStr) {
  if (!dateStr) return "-";

  const date = new Date(dateStr);
  const options = { day: "2-digit", month: "short", year: "numeric" };

  return date.toLocaleDateString("en-GB", options);
}

// ==============================
//  DATE & STATUS LOGIC IN EDIT PAGE
// ==============================
export function getDaysSince(dateString) {
  if (!dateString) return 0;

  const date = new Date(dateString);
  if (isNaN(date)) return 0;

  const today = new Date();

  const diffTime = today - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

 // ==============================
 // DETECT PLATFORM
 // ==============================

export function detectPlatform(link) {
  if (!link) return null;
  link = link.toLowerCase();

  if (link.includes("wallapop.com")) return "wallapop";
  if (link.includes("vinted.")) return "vinted";
  if (link.includes("milanuncios.com")) return "milanuncios";
  return null;
}

/**
 * Extracts platform-specific links from the TXT content.
 * @param {string} text
 * @returns {object}
 */
export function extractPlatformLinks(text) {
  if (!text) {
    return {
      wallapop: "",
      vinted: "",
      milanuncios: ""
    };
  }

  const extractLink = (platform) => {
    const regex = new RegExp(
      `\\[LINK\\s+${platform}\\]\\s*(https?:\\/\\/[^\\s]+)?`,
      "i"
    );
    const match = text.match(regex);
    return match && match[1] ? match[1].trim() : "";
  };

  return {
    wallapop: extractLink("WALLAPOP"),
    vinted: extractLink("VINTED"),
    milanuncios: extractLink("MILANUNCIOS")
  };
}

// ==============================
//  IMAGE FUNCTIONS
// ==============================

export function getImage(item) {
  if (item.images && item.images.length > 0) {
    return item.images[0]; // already full URL
  }

  return "images/no-image.jpg";
}

// ==============================
// TXT PARSING FUNCTIONS
// ==============================

/**
 * Parses a specific platform section from the TXT content.
 * @param {string} text
 * @param {string} platform
 * @returns {object}
 */
export function parsePlatform(text, platform) {
  const sectionRegex = new RegExp(
    `===\\s*${platform}\\s*===([\\s\\S]*?)(?===|$)`,
    "i"
  );

  const sectionMatch = text.match(sectionRegex);
  const section = sectionMatch ? sectionMatch[1] : "";

  const title = extractTag(section, "TÍTULO");
  const description = extractTag(section, "DESCRIPCIÓN");
  const price = parsePrice(extractTag(section, "PRECIO"));
  const compra = parsePrice(extractTag(section, "COMPRA"));
  const comision = parsePrice(extractTag(section, "COMISION"));
  const profit = calculateProfit(price, compra, comision);

  return {
    title,
    description,
    price,
    compra,
    comision,
    profit
  };
}

/**
 * Extracts platform-specific data from a TXT file.
 * @param {string} text
 * @param {string} platform
 * @returns {object}
 */
function extractPlatformData(text, platform) {
  const sectionRegex = new RegExp(
    `=== ${platform} ===([\\s\\S]*?)(?===|$)`,
    "i"
  );

  const sectionMatch = text.match(sectionRegex);
  const section = sectionMatch ? sectionMatch[1] : "";

  function extract(field) {
    const regex = new RegExp(
      `\\[${field}\\]([\\s\\S]*?)(?=\\n\\[|$)`,
      "i"
    );
    const match = section.match(regex);
    return match ? match[1].trim() : "";
  }

  const parsePrice = (value) =>
    parseFloat(value.replace("€", "").replace(",", ".").trim()) || 0;

  const buy = parsePrice(extract("COMPRA"));
  const price = parsePrice(extract("PRECIO"));
  const fees = parsePrice(extract("COMISION"));

  return {
    title: extract("TÍTULO"),
    description: extract("DESCRIPCIÓN"),
    price,
    buy,
    fees,
    profit: price - buy - fees
  };
}

/**
 * Parses the entire TXT file of an item.
 * @param {string} text
 * @returns {object}
 */
export function parseItemFile(text) {
  // Extract platform links
  const links = extractPlatformLinks(text);

  return {
    links,
    link: links.wallapop || links.vinted || links.milanuncios || "",
    wallapop: extractPlatformData(text, "WALLAPOP"),
    vinted: extractPlatformData(text, "VINTED"),
    milanuncios: extractPlatformData(text, "MILANUNCIOS")
  };
}

// ==============================
//  STATUS SYSTEM (SINGLE SOURCE)
// ==============================

export const STATUS_CONFIG = {
  Disponible: {
    class: "status-disponible",
    color: "#64748b",
    label: "Disponible"
  },
  Reservado: {
    class: "status-reservado",
    color: "#f59e0b",
    label: "⏳ Reservado"
  },
  Vendido: {
    class: "status-vendido",
    color: "#16a34a",
    label: "✔ Vendido"
  }
};

export function getStatusClass(status) {
  return STATUS_CONFIG[status]?.class || "status-disponible";
}

export function getStatusColor(status) {
  return STATUS_CONFIG[status]?.color || "#64748b";
}

export function getStatusLabel(status) {
  return STATUS_CONFIG[status]?.label || status;
}