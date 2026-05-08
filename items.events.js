// ==============================
//  FILTER SETUP
// ============================== 

export function setupFilters(setSearchQuery, setStatusFilter) {

  const searchInput = document.getElementById("searchInput");
  const statusSelect = document.getElementById("statusFilter");

  searchInput?.addEventListener("input", (e) => {
    setSearchQuery(e.target.value.toLowerCase());
  });

  statusSelect?.addEventListener("change", (e) => {
    setStatusFilter(e.target.value);
  });

}

// ==============================
//  AUTHENTICATION GOOGLE
// ==============================

import { supabase } from "./supabase.js";

export function initAuthEvents() {
  const btn = document.getElementById("googleLoginBtn");

  if (!btn) return;

  btn.addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          prompt: "select_account"
        }
      }
    });
  });
  
}

// ==============================
//  LOGOUT
// ==============================

export function initLogoutEvent() {
  const btn = document.getElementById("logoutBtn");

  if (!btn) return;

  btn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}

// ==============================
//  CARD FLIP
// ==============================

export function initCardEvents() {
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("flip-btn")) {
      const card = e.target.closest(".card");
      card.classList.toggle("flipped");
    }
  });
}

// ==============================
// HEADER: USER MENU
// ==============================

export function initUserMenu() {
  const menu = document.getElementById("userMenu");
  const dropdown = document.getElementById("userDropdown");

  if (!menu || !dropdown) return;

  menu.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  document.addEventListener("click", () => {
    dropdown.classList.remove("open");
  });

  dropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });
}

// ==============================
// HEADER: MOBILE ACTIONS MENU
// ==============================

export function initActionsMenu() {
  const actionsBtn = document.getElementById("actionsMenuBtn");
  const actionsDropdown = document.getElementById("actionsDropdown");

  if (!actionsBtn || !actionsDropdown) return;

  actionsBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    actionsDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    actionsDropdown.classList.add("hidden");
  });

  actionsDropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  function closeActionsMenu() {
    actionsDropdown.classList.add("hidden");
  }

  document.getElementById("mobileDashboardBtn")?.addEventListener("click", () => {
    document.getElementById("dashboardBtn")?.click();
    closeActionsMenu();
  });

  document.getElementById("mobileImportBtn")?.addEventListener("click", () => {
    document.getElementById("openImportModalBtn")?.click();
    closeActionsMenu();
  });

  document.getElementById("mobileFolderBtn")?.addEventListener("click", () => {
    document.getElementById("importFolderBtn")?.click();
    closeActionsMenu();
  });

  document.getElementById("mobilePromptBtn")?.addEventListener("click", () => {
    document.getElementById("masterPromptBtn")?.click();
    closeActionsMenu();
  });

  document.getElementById("mobileTableBtn")?.addEventListener("click", () => {
    document.getElementById("tableViewBtn")?.click();
    closeActionsMenu();
  });

  document.getElementById("mobileCardsBtn")?.addEventListener("click", () => {
    document.getElementById("cardViewBtn")?.click();
    closeActionsMenu();
  });
}