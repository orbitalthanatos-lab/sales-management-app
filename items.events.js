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