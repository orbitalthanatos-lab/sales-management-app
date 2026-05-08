import { supabase } from "./supabase.js";

document.addEventListener("DOMContentLoaded", async () => {
  // ==============================
  // GET CURRENT USER
  // ==============================

  const {
    data: { user }
  } = await supabase.auth.getUser();

  // Redirect if not logged in
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // ==============================
  // EXTRACT USER DATA
  // ==============================

  const fullName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    "Unknown User";

  const email = user.email || "-";

  const avatar =
    user.user_metadata?.avatar_url ||
    "https://via.placeholder.com/120";

  const provider =
    user.app_metadata?.provider ||
    "google";

  // ==============================
  // RENDER DATA
  // ==============================

  document.getElementById("accountName").innerText = fullName;
  document.getElementById("accountEmail").innerText = email;
  document.getElementById("accountProvider").innerText = provider;
  document.getElementById("accountAvatar").src = avatar;

  // ==============================
  // BACK BUTTON
  // ==============================

  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
});