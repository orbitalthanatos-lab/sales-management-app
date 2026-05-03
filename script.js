// ==============================
// IMPORTS
// ==============================

// import { db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "./firebase.js";
import { calculateProfitValue, calculateStats, formatDate, getDaysSince, detectPlatform } from "./items.logic.js";
import { renderInventoryStats, renderTableUI, renderMobileCards } from "./items.ui.js";
import { setupFilters } from "./items.events.js";
import { createCard } from "./ui.components.js";
import { parseItemFile } from "./items.logic.js";
import { supabase } from "./supabase.js";
import { importFromFolder } from "./items.import.js";
import { initAuthEvents, initLogoutEvent } from "./items.events.js";

export let currentUser = null;

export async function initUser() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "login.html";
    return null;
  }

  currentUser = user;
  return user;
}

// ==============================
// MAIN
// ==============================

document.addEventListener("DOMContentLoaded", async () => {

  initAuthEvents(); 
  initLogoutEvent();
  
  // ==============================
  // CHECK AUTH AND SHOW/HIDE LOGOUT
  // ==============================

  const user = await initUser();

  renderUserInfo();
  initUserMenu();

  // ==============================
  // ACCOUNT PAGE (COMING SOON)
  // ==============================

  document.getElementById("accountBtn")?.addEventListener("click", () => {
    alert("Account page coming soon");
  });

  // ==============================
  // RENDER USER INFO
  // ==============================

  function renderUserInfo() {
    if (!currentUser) return;

    const nameEl = document.getElementById("userName");
    const avatarEl = document.getElementById("userAvatar");

    const name =
      currentUser.user_metadata?.full_name ||
      currentUser.user_metadata?.name ||
      "";

    if (nameEl) {
      nameEl.innerText = name;
    }

    if (avatarEl) {
      avatarEl.src =
        currentUser.user_metadata?.avatar_url ||
        "https://via.placeholder.com/32";
    }
  }

  // ==============================
  // USER MENU
  // ==============================

  function initUserMenu() {
    const menu = document.getElementById("userMenu");
    const dropdown = document.getElementById("userDropdown");

    if (!menu || !dropdown) return;

    // Toggle dropdown
    menu.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdown.style.display =
        dropdown.classList.toggle("open");
    });

    // Close when clicking outside
    document.addEventListener("click", () => {
      dropdown.classList.remove("open");
    });

    // Prevent closing when clicking inside dropdown
    dropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  // ==============================
  // LOAD ITEMS
  // ============================== 

  let items = [];
  let currentImages = [];
  let currentImageIndex = 0;

  let selectedFiles = [];
  let currentUploadItemId = null;

  // ==============================
  // VIEW IMAGES
  // ==============================

  function openImageViewer(images, startIndex = 0) {
    currentImages = images;
    currentImageIndex = startIndex;

    updateViewerImage();

    document.getElementById("imageViewer").classList.remove("hidden");

    document.body.style.overflow = "hidden";
  }

  // ==============================
  // UPDATE VIEWER IMAGE
  // ==============================
  function updateViewerImage() {
    const img = document.getElementById("viewerImg");
    const counter = document.getElementById("viewerCounter");

    if (!img || currentImages.length === 0) return;

    const current = currentImages[currentImageIndex];

    img.src = current;

    // Counter
    if (counter) {
      counter.innerText = `${currentImageIndex + 1} / ${currentImages.length}`;
    }

    renderThumbnails();
  }

  // ==============================
  // RENDER THUMBNAILS
  // ==============================
  function renderThumbnails() {
    const container = document.getElementById("viewerThumbnails");
    if (!container) return;

    container.innerHTML = "";

    currentImages.forEach((imgPath, index) => {
      const img = document.createElement("img");

      if (imgPath.startsWith("data:")) {
        img.src = imgPath;
      } else if (
        imgPath.startsWith("images/") ||
        imgPath.startsWith("http") ||
        imgPath.startsWith("/")
      ) {
        img.src = imgPath;
      } else {
        if (imgPath.startsWith("data:")) {
          img.src = imgPath;
        } else if (
          imgPath.startsWith("images/") ||
          imgPath.startsWith("http") ||
          imgPath.startsWith("/")
        ) {
          img.src = imgPath;
        } else {
          img.src = `items/${imgPath}`;
        }
      }

      img.style.width = "60px";
      img.style.height = "60px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";
      img.style.cursor = "pointer";
      img.style.opacity = index === currentImageIndex ? "1" : "0.5";
      img.style.border = index === currentImageIndex
        ? "2px solid #3b82f6"
        : "2px solid transparent";

      img.onclick = () => {
        currentImageIndex = index;
        updateViewerImage();
      };

      container.appendChild(img);
    });
  }

  // ==============================
  // IMAGE VIEWER EVENTS
  // ==============================

  document.querySelector("#imageViewer .modal-content")?.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Close (X)
  document.getElementById("closeViewer")?.addEventListener("click", () => {
    document.getElementById("imageViewer").classList.add("hidden");

    document.body.style.overflow = "";
  });

  // Click outside
  document.getElementById("imageViewer")?.addEventListener("click", (e) => {
    if (e.target.id === "imageViewer") {
      document.getElementById("imageViewer").classList.add("hidden");

      document.body.style.overflow = "";
    }
  });

  // Prev
  document.getElementById("prevImg")?.addEventListener("click", () => {
    if (currentImages.length === 0) return;

    currentImageIndex =
      (currentImageIndex - 1 + currentImages.length) % currentImages.length;

    updateViewerImage();
  });

  // Next
  document.getElementById("nextImg")?.addEventListener("click", () => {
    if (currentImages.length === 0) return;

    currentImageIndex =
      (currentImageIndex + 1) % currentImages.length;

    updateViewerImage();
  });

  document.addEventListener("keydown", (e) => {
    const viewer = document.getElementById("imageViewer");
    if (!viewer || viewer.classList.contains("hidden")) return;

    if (e.key === "ArrowRight") {
      document.getElementById("nextImg").click();
    }

    if (e.key === "ArrowLeft") {
      document.getElementById("prevImg").click();
    }

    if (e.key === "Escape") {
      viewer.classList.add("hidden");

      document.body.style.overflow = "";
    }
  });

  // ==============================
  // LOAD ITEMS
  // ============================== 
  async function loadItems() {
    try {
      // 1. Get items
      const { data: itemsData, error: itemsError } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: true });

      if (itemsError) throw itemsError;

      // 2. Get platforms
      const { data: platformsData, error: platformsError } = await supabase
        .from("item_platforms")
        .select("*");

      if (platformsError) throw platformsError;

      // 3. Build items structure
      items = itemsData.map(item => {
        const platformData = {};
        const links = {};

        platformsData
          .filter(p => p.item_id === item.id)
          .forEach(p => {
            platformData[p.platform] = {
              title: p.title,
              description: p.description,
              price: p.price,
              fees: p.fees,
              buy: p.buy
            };

            links[p.platform] = p.url || "";
          });

        return {
          ...item,

          // 🔥 FIX: map DB fields to frontend
          selectedPlatform: item.selected_platform || "wallapop",
          soldPlatform: item.sold_platform || "",
          datePublished: item.date_published || "",
          dateSold: item.date_sold || "",

          platformData,
          links,
          images: item.images || []
          // links: item.links || {}
        };
      });

      renderTable();

    } catch (error) {
      console.error("Error loading items:", error);
    }
  }

  // ==============================
  // LOAD ITEMS
  // ==============================

  async function importFromText() {
    const text = document.getElementById("importText").value;

    if (!text.trim()) {
      alert("Paste something first");
      return;
    }

    try {
      const platforms = parseDataText(text);

      const buy = extractValue(text, "COMPRA");

      // 1️⃣ Insert item
      const today = new Date().toISOString().split("T")[0];

    const { data: itemData, error: itemError } = await supabase
      .from("items")
      .insert([
        {
          status: "Disponible",
          date_published: today,
          user_id: currentUser.id
        }
      ])
        .select()
        .single();

      if (itemError) throw itemError;

      const itemId = itemData.id;

      // 2️⃣ Insert platforms
      for (const p of platforms) {
        await supabase.from("item_platforms").insert([
          {
            item_id: itemId,
            platform: p.platform,
            title: p.title,
            description: p.description,
            price: parseFloat(p.price),
            fees: parseFloat(p.fees),
            url: p.url
          }
        ]);
      }

      // 3️⃣ Refresh UI
      await loadItems();

      // 4️⃣ Clear textarea
      document.getElementById("importText").value = "";

      alert("Item imported 🚀");

    } catch (error) {
      console.error(error);
      alert("Error importing item");
    }
  }

  // ==============================
  // PARSE TEXT
  // ==============================

  function parseDataText(text) {
    const sections = text.split("=== ").slice(1);

    return sections.map(section => {
      const platform = section.split(" ===")[0].trim().toLowerCase();

      return {
        platform,
        url: extractValue(section, "LINK"),
        title: extractValue(section, "TÍTULO"),
        description: extractValue(section, "DESCRIPCIÓN"),
        price: extractValue(section, "PRECIO"),
        fees: extractValue(section, "COMISION")
      };
    });
  }

  // ==============================
  // EXTRACT VALUE
  // ==============================

  function extractValue(text, key) {
    const regex = new RegExp(`\\[${key}[^\\]]*\\][\\s\\S]*?\\n([^\\[]+)`);
    const match = text.match(regex);

    return match ? match[1].trim().replace("€", "") : "";
  }

  // ==============================
  // SAVE ITEMS
  // ============================== 

  function saveItems() {
    const state = {};

    items.forEach(item => {
      state[item.id] = {
        status: item.status,
        soldPlatform: item.soldPlatform,
        dateSold: item.dateSold,
        datePublished: item.datePublished
      };
    });

    localStorage.setItem("uiState", JSON.stringify(state));
  }

  // ==============================
  // PLATFORM CONFIG
  // ==============================

  const PLATFORMS = {
    wallapop: { name: "Wallapop", icon: "images/Wallapop_icon.jpg" },
    vinted: { name: "Vinted", icon: "images/Vinted_icon.jpg" },
    milanuncios: { name: "Milanuncios", icon: "images/Milanuncios_icon.jpg" }
  };

  // ==============================
  // GLOBAL STATE
  // ==============================

  let currentTab = "wallapop";
  let searchQuery = "";
  let statusFilter = "";

  let platformData = {};
  Object.keys(PLATFORMS).forEach(p => {
    platformData[p] = { title: "", description: "" };
  });

  // ==============================
  // PROFIT CALCULATION
  // ==============================

  function calculateProfit() {
    const buy = parseFloat(document.getElementById("buyPrice")?.value) || 0;
    const sale = parseFloat(document.getElementById("salePrice")?.value) || 0;
    const fees = parseFloat(document.getElementById("fees")?.value) || 0;

    const profit = calculateProfitValue(buy, sale, fees);

    const el = document.getElementById("profitPreview");
    if (!el) return;

    el.innerText = profit.toFixed(2) + " €";
    el.style.color = profit > 0 ? "#16a34a" : profit < 0 ? "#dc2626" : "#6b7280";
  }

  // ==============================
  // STATS
  // ==============================

  function updateStats() {
    const stats = calculateStats(items);

    const container = document.getElementById("statsContainer");

    container.innerHTML = `
      ${createCard({
      id: "cardItems",
      title: "📦 ARTÍCULOS",
      valueId: "totalItems",
      subId: "totalItemsSub"
    })}

      ${createCard({
      id: "cardSold",
      title: "✅ VENDIDOS",
      valueId: "soldItems",
      subId: "soldItemsSub"
    })}

      ${createCard({
      id: "cardProfit",
      title: "💰 BENEFICIO TOTAL",
      valueId: "totalProfit",
      subId: "totalProfitSub"
    })}

      ${createCard({
      id: "cardPotential",
      title: "📈 BENEFICIO POTENCIAL",
      valueId: "potentialProfit",
      subId: "potentialProfitSub"
    })}
    `;

    renderInventoryStats(stats);
  }

  // ==============================
  // RENDER TABLE
  // ==============================

  function renderTable() {

    if (window.innerWidth < 768) {
      renderMobileCards(items);
    } else {
      renderTableUI(
        items,
        PLATFORMS,
        { formatDate, getDaysSince },
        { searchQuery, statusFilter }
      );
    }

    lucide.createIcons();
    updateStats();
  }

  function setSearchQuery(value) {
    searchQuery = value;
    renderTable();
  }

  function setStatusFilter(value) {
    statusFilter = value;
    renderTable();
  }

  // ==============================
  // SWITCH PLATFORM
  // ==============================

  window.switchPlatform = async (id, platform) => {
    const platforms = ["wallapop", "vinted", "milanuncios"];

    const item = items.find(i => i.id === id);

    // Prevent switching if sold
    if (!item || item.status === "Vendido") return;

    let current = item.selectedPlatform || "wallapop";
    let index = platforms.indexOf(current);

    // 🔥 HANDLE ARROWS
    if (platform === "next") {
      index = (index + 1) % platforms.length;
    } else if (platform === "prev") {
      index = (index - 1 + platforms.length) % platforms.length;
    } else {
      index = platforms.indexOf(platform);
    }

    const newPlatform = platforms[index];

    try {
      const { error } = await supabase
        .from("items")
        .update({
          selected_platform: newPlatform
        })
        .eq("id", id);

      if (error) throw error;

      await loadItems();

    } catch (error) {
      console.error("Error updating platform:", error);
      alert("Error updating platform");
    }
  };

  // ==============================
  // UPDATE STATUS
  // ==============================

  window.updateStatus = async (id, status) => {
    const item = items.find(i => i.id === id);

    try {
      const updateData = {
        status
      };

      if (status === "Vendido") {
        updateData.date_sold = new Date().toISOString().split("T")[0];
        updateData.sold_platform =
          item.selectedPlatform ||
          item.soldPlatform ||
          "wallapop";
      } else {
        updateData.date_sold = null;
        updateData.sold_platform = null;
      }

      // 🔥 UPDATE IN SUPABASE
      const { error } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", item.id);

      if (error) throw error;

      // 🔄 Reload from DB
      await loadItems();

    } catch (error) {
      console.error("Error updating status:", error);
      alert("Error updating status");
    }
  };

  setupFilters(setSearchQuery, setStatusFilter);

  // ==============================
  // URL CLEANING
  // ==============================

  function cleanUrl(url) {
    if (!url) return "";
    const match = url.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : "";
  }

  loadItems();

  // ==============================
  // HANDLE RESIZE
  // ============================== 

  window.addEventListener("resize", () => {
    renderTable();
  });

  // ==============================
  // GLOBAL EXPORTS
  // ==============================

  window.platformData = platformData;

  window.detectPlatform = detectPlatform;

  window.calculateProfit = calculateProfit;

  // ==============================
  // UPDATE SOLD PLATFORM
  // ==============================

  window.updateSoldPlatform = async (id, platform) => {
    const item = items.find(i => i.id === id);

    try {
      const updateData = {
        sold_platform: platform,
        selected_platform: platform, // 🔥 sync icon automatically
        status: platform ? "Vendido" : item.status
      };

      if (platform) {
        updateData.date_sold = new Date().toISOString().split("T")[0];
      }

      const { error } = await supabase
        .from("items")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      await loadItems();

    } catch (error) {
      console.error(error);
      alert("Error updating sold platform");
    }
  };

  // ==============================
  // EDIT ITEM
  // ==============================

  window.editItem = (id) => {
    window.location.href = `edit.html?id=${id}`;
  };

  // ==============================
  // OPEN IMAGE VIEWER
  // ==============================

  window.openImageViewerFromIndex = (index) => {
    const item = items[index];
    console.log("Opening viewer for item:", item);

    // Case 1: Images from sync.js
    if (item.images && item.images.length > 0) {
      openImageViewer(item.images, 0);
      return;
    }

    // Case 2: Manually uploaded image
    if (item.image) {
      openImageViewer([item.image], 0);
      return;
    }

    console.warn("No images found for item:", item);
  };

  // ==============================
  // UPLOAD IMAGES
  // ==============================

  window.uploadImagesForItem = (itemId) => {
    const input = document.getElementById("imageUploadInput");

    currentUploadItemId = itemId;
    input.value = "";

    input.onchange = () => {
      selectedFiles = Array.from(input.files);

      if (!selectedFiles.length) return;

      renderPreview();
      document.getElementById("imagePreviewModal").classList.remove("hidden");
    };

    input.click();
  };

  // ==============================
  // RENDER PREVIEW
  // ==============================

  function renderPreview() {
    const container = document.getElementById("previewContainer");
    container.innerHTML = "";

    selectedFiles.forEach((file, index) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const wrapper = document.createElement("div");

        wrapper.style.position = "relative";

        wrapper.innerHTML = `
          <img src="${e.target.result}" style="
            width:100px;
            height:100px;
            object-fit:cover;
            border-radius:6px;
          ">
          <button style="
            position:absolute;
            top:-5px;
            right:-5px;
            background:red;
            color:white;
            border:none;
            border-radius:50%;
            width:20px;
            height:20px;
            cursor:pointer;
          " onclick="removePreview(${index})">×</button>
        `;

        container.appendChild(wrapper);
      };

      reader.readAsDataURL(file);
    });
  }

  // ==============================
  // REMOVE PREVIEW
  // ==============================

  window.removePreview = (index) => {
    selectedFiles.splice(index, 1);
    renderPreview();
  };

  // ==============================
  // CANCEL UPLOAD
  // ==============================

  window.cancelUpload = () => {
    selectedFiles = [];
    currentUploadItemId = null;

    document.getElementById("imagePreviewModal").classList.add("hidden");
  };

  // ==============================
  // CONFIRM UPLOAD
  // ==============================

  window.confirmUpload = async () => {
    if (!selectedFiles.length || !currentUploadItemId) return;

    try {
      const uploadedUrls = [];

      for (let file of selectedFiles) {
        const filePath = `${currentUploadItemId}/${Date.now()}_${file.name}`;

        const { error } = await supabase.storage
          .from("items")
          .upload(filePath, file);

        if (error) {
          alert(error.message);
          return;
        }

        const { data } = supabase.storage
          .from("items")
          .getPublicUrl(filePath);

        uploadedUrls.push(data.publicUrl);
      }

      // Save to DB
      const { data: itemData } = await supabase
        .from("items")
        .select("images")
        .eq("id", currentUploadItemId)
        .single();

      const existingImages = itemData.images || [];

      await supabase
        .from("items")
        .update({
          images: [...existingImages, ...uploadedUrls]
        })
        .eq("id", currentUploadItemId);

      // Cleanup
      cancelUpload();
      await loadItems();

    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  };

  // ==============================
  // DELETE ITEM
  // ==============================

  window.deleteItem = async (itemId) => {
    const confirmDelete = confirm("Are you sure you want to delete this item?");

    if (!confirmDelete) return;

    try {
      // 1️⃣ Delete platforms
      await supabase
        .from("item_platforms")
        .delete()
        .eq("item_id", itemId);

      // 2️⃣ Delete images (if using table)
      await supabase
        .from("item_images")
        .delete()
        .eq("item_id", itemId);

      // 3️⃣ Delete main item
      await supabase
        .from("items")
        .delete()
        .eq("id", itemId);

      // 4️⃣ Refresh UI
      await loadItems();

      // alert("Item deleted ✅");

    } catch (err) {
      console.error(err);
      alert("Error deleting item");
    }
  };

  // ==============================
  // IMPORT BUTTON LOCK
  // ==============================

  const importBtn = document.getElementById("importFolderBtn");
  const textImportBtn = document.getElementById("importBtn"); // text import button

  document.addEventListener("import:start", () => {
    if (importBtn) {
      importBtn.disabled = true;
      importBtn.innerText = "⏳ Importing...";
    }

    if (textImportBtn) {
      textImportBtn.disabled = true;
      textImportBtn.innerText = "⏳ Importing...";
    }
  });

  document.addEventListener("import:end", () => {
    if (importBtn) {
      importBtn.disabled = false;
      importBtn.innerText = "Import Folder";
    }

    if (textImportBtn) {
      textImportBtn.disabled = false;
      textImportBtn.innerText = "Import";
    }
  });

  // ==============================
  // BULK IMPORT (FOLDER)
  // ==============================

  const folderInput = document.getElementById("folderInput");
  const importFolderBtn = document.getElementById("importFolderBtn");

  if (importFolderBtn && folderInput) {

    importFolderBtn.addEventListener("click", () => {
      folderInput.click();
    });

    folderInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files);

      if (!files.length) return;

      await importFromFolder(files);

      await loadItems(); // refresh UI
    });

  }

  // ==============================
  // MASTER PROMPT COPY
  // ==============================

  document.getElementById("masterPromptBtn").addEventListener("click", async () => {
    try {
      const res = await fetch("https://raw.githubusercontent.com/orbitalthanatos-lab/master-prompt/refs/heads/main/prompt.txt");
      const text = await res.text();

      await navigator.clipboard.writeText(text);

      alert("Prompt copied!");
    } catch (err) {
      console.error(err);
      alert("Failed to copy prompt");
    }
  });

  window.importFromText = importFromText;
  window.loadItems = loadItems;

});