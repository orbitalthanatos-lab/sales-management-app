/**
 * ============================================================
 * SYNC.JS – AUTO-GENERATE items.json FROM ITEM FOLDERS
 * ============================================================
 * This script:
 * 1. Watches the /items directory
 * 2. Reads each item's data.txt file
 * 3. Extracts platform data (Wallapop, Vinted, Milanuncios)
 * 4. Detects images automatically
 * 5. Generates /data/items.json
 *
 * Run with: node sync.js
 * ============================================================
 */

const chokidar = require("chokidar");
const fs = require("fs-extra");
const path = require("path");

const ITEMS_DIR = path.join(__dirname, "items");
const OUTPUT_FILE = path.join(__dirname, "data", "items.json");

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function extractTag(text, tag) {
  const regex = new RegExp(`\\[${tag}\\]\\s*([\\s\\S]*?)(?=\\n\\[|$)`, "i");
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function parsePrice(value) {
  if (!value) return 0;
  return (
    parseFloat(
      value.replace("€", "").replace(",", ".").trim()
    ) || 0
  );
}

function extractSection(text, section) {
  const regex = new RegExp(
    `===\\s*${section}\\s*===([\\s\\S]*?)(?===|$)`,
    "i"
  );
  const match = text.match(regex);
  return match ? match[1] : "";
}

function extractLink(text, platform) {
  const regex = new RegExp(
    `\\[LINK\\s+${platform}\\]\\s*(https?:\\/\\/[^\\s]+)?`,
    "i"
  );
  const match = text.match(regex);
  return match && match[1] ? match[1].trim() : "";
}

// ============================================================
// PARSE PLATFORM DATA
// ============================================================

function parsePlatform(text, platform) {
  const section = extractSection(text, platform);

  if (!section) {
    return {
      title: "",
      description: "",
      price: 0,
      buy: 0,
      fees: 0,
      profit: 0,
    };
  }

  const title = extractTag(section, "TÍTULO");
  const description = extractTag(section, "DESCRIPCIÓN");
  const price = parsePrice(extractTag(section, "PRECIO"));
  const buy = parsePrice(extractTag(section, "COMPRA"));
  const fees = parsePrice(extractTag(section, "COMISION"));
  const profit = price - buy - fees;

  return { title, description, price, buy, fees, profit };
}

function parseItemFile(text) {
  return {
    wallapop: parsePlatform(text, "WALLAPOP"),
    vinted: parsePlatform(text, "VINTED"),
    milanuncios: parsePlatform(text, "MILANUNCIOS"),
    links: {
      wallapop: extractLink(text, "WALLAPOP"),
      vinted: extractLink(text, "VINTED"),
      milanuncios: extractLink(text, "MILANUNCIOS"),
    },
  };
}

// ============================================================
// BUILD ITEMS.JSON
// ============================================================

async function buildItems() {
  try {
    console.log("🔄 Scanning items directory...");

    await fs.ensureDir(path.dirname(OUTPUT_FILE));

    const folders = await fs.readdir(ITEMS_DIR);
    const items = [];

    for (const folder of folders) {
      const itemPath = path.join(ITEMS_DIR, folder);
      const stat = await fs.stat(itemPath);

      if (!stat.isDirectory()) continue;

      const dataFile = path.join(itemPath, "data.txt");
      if (!(await fs.pathExists(dataFile))) {
        console.warn(`⚠️ Missing data.txt in ${folder}`);
        continue;
      }

      // Read and parse TXT
      const raw = await fs.readFile(dataFile, "utf-8");
      const parsed = parseItemFile(raw);

      // Detect images
      const images = (await fs.readdir(itemPath))
        .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
        .map(file => `${folder}/${file}`);

      // Default financial data from Wallapop
      const defaultPlatform = parsed.wallapop;

      items.push({
        id: folder,

        platformData: {
          wallapop: parsed.wallapop,
          vinted: parsed.vinted,
          milanuncios: parsed.milanuncios,
        },

        selectedPlatform: "wallapop",

        links: parsed.links,

        buy: defaultPlatform.buy || 0,
        fees: defaultPlatform.fees || 0,
        profit: defaultPlatform.profit || 0,

        status: "Disponible",
        soldPlatform: "",

        datePublished: new Date().toISOString().split("T")[0],
        dateSold: "",

        images,
      });
    }

    // Sort items numerically (item-001, item-002, ...)
    items.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    // Save JSON
    await fs.writeJson(OUTPUT_FILE, items, { spaces: 2 });

    console.log(`✅ items.json updated successfully! (${items.length} items)`);
  } catch (error) {
    console.error("❌ Error building items.json:", error);
  }
}

// ============================================================
// WATCH FOR CHANGES
// ============================================================

let timeout;

chokidar
  .watch(ITEMS_DIR, {
    ignoreInitial: false,
    persistent: true,
  })
  .on("all", () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.log("📁 Changes detected. Rebuilding...");
      buildItems();
    }, 300);
  });

console.log("👀 Watching items directory...");