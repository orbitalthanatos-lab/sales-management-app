import { supabase } from "./supabase.js";

let currentUser = null;
let currentProfile = null;

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

  currentUser = user;

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
  // RENDER ACCOUNT DATA
  // ==============================

  document.getElementById("accountName").innerText = fullName;
  document.getElementById("accountEmail").innerText = email;
  document.getElementById("accountProvider").innerText = provider;
  document.getElementById("accountAvatar").src = avatar;

  // ==============================
  // LOAD PUBLIC STOREFRONT SETTINGS
  // ==============================

  currentProfile = await getOrCreatePublicProfile(
    user,
    fullName
  );

  renderPublicStoreSettings(currentProfile);

  // ==============================
  // SETUP EVENT LISTENERS
  // ==============================

  setupPublicStoreEvents();

  // ==============================
  // SHARE STORE
  // ==============================

  function setupPublicStoreEvents() {
    const saveBtn =
      document.getElementById("saveStoreSettingsBtn");

    const copyBtn =
      document.getElementById("copyStoreLinkBtn");

    const openBtn =
      document.getElementById("openStoreBtn");

    const shareBtn =
      document.getElementById("shareStoreBtn");

    if (saveBtn) {
      saveBtn.addEventListener("click", savePublicStoreSettings);
    }

    if (copyBtn) {
      copyBtn.addEventListener("click", copyPublicStoreLink);
    }

    if (openBtn) {
      openBtn.addEventListener("click", openPublicStore);
    }

    if (shareBtn) {
      shareBtn.addEventListener("click", sharePublicStore);
    }
  }

  // ==============================
  // BACK BUTTON
  // ==============================

  document.getElementById("backBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });
});

// ==============================
// EVENT LISTENERS
// ==============================

function setupPublicStoreEvents() {
  const saveBtn =
    document.getElementById("saveStoreSettingsBtn");

  const copyBtn =
    document.getElementById("copyStoreLinkBtn");

  const openBtn =
    document.getElementById("openStoreBtn");

  if (saveBtn) {
    saveBtn.addEventListener("click", savePublicStoreSettings);
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", copyPublicStoreLink);
  }

  if (openBtn) {
    openBtn.addEventListener("click", openPublicStore);
  }
}

// ==============================
// SAVE SETTINGS
// ==============================

async function savePublicStoreSettings() {
  if (!currentUser || !currentProfile) return;

  const storeName =
    document.getElementById("storeNameInput").value.trim();

  const isPublic =
    document.getElementById("isPublicCheckbox").checked;

  const { data, error } = await supabase
    .from("public_profiles")
    .update({
      store_name: storeName,
      is_public: isPublic
    })
    .eq("user_id", currentUser.id)
    .select()
    .single();

  if (error) {
    console.error("Error saving store settings:", error);
    alert("Error saving store settings.");
    return;
  }

  currentProfile = data;

  renderPublicStoreSettings(currentProfile);

  alert("Store settings saved successfully.");
}

// ==============================
// COPY LINK
// ==============================

async function copyPublicStoreLink() {
  const url = getPublicStoreUrl();

  try {
    await navigator.clipboard.writeText(url);
    alert("Public store link copied to clipboard.");
  } catch (error) {
    console.error("Error copying link:", error);
    alert("Unable to copy the link.");
  }
}

// ==============================
// OPEN STORE
// ==============================

function openPublicStore() {
  const url = getPublicStoreUrl();
  window.open(url, "_blank");
}

// ==============================
// SHARE STORE
// ==============================

async function sharePublicStore() {
  const url = getPublicStoreUrl();

  const storeName =
    currentProfile?.store_name ||
    "My Store";

  if (navigator.share) {
    try {
      await navigator.share({
        title: storeName,
        text: `Check out my public store: ${storeName}`,
        url
      });
      return;
    } catch (error) {
      // User cancelled the share dialog
      if (error.name === "AbortError") {
        return;
      }

      console.error("Error sharing store:", error);
    }
  }

  // Fallback: copy the link
  await copyPublicStoreLink();
}

// ==============================
// URL HELPERS
// ==============================

function getPublicStoreUrl() {
  const baseUrl =
    `${window.location.origin}/share/index.html`;

  return `${baseUrl}?slug=${currentProfile.public_slug}`;
}

// ==============================
// PUBLIC PROFILE HELPERS
// ==============================

async function getOrCreatePublicProfile(user, fullName) {
  // First, try to load the existing profile
  const { data: existingProfile, error: loadError } =
    await supabase
      .from("public_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

  // If a profile already exists, return it unchanged
  if (existingProfile) {
    return existingProfile;
  }

  // Ignore "not found" errors and create a new profile
  if (
    loadError &&
    loadError.code !== "PGRST116"
  ) {
    console.error(
      "Error loading public profile:",
      loadError
    );
  }

  const generatedSlug = generateSlug(fullName);

  // Create the profile only once
  const { data, error } = await supabase
    .from("public_profiles")
    .insert({
      user_id: user.id,
      public_slug: generatedSlug,
      is_public: false,
      store_name: fullName
    })
    .select()
    .single();

  if (error) {
    console.error(
      "Error creating public profile:",
      error
    );

    return {
      public_slug: generatedSlug,
      is_public: false,
      store_name: fullName
    };
  }

  return data;
}

// ==============================
// RENDER SETTINGS
// ==============================

function renderPublicStoreSettings(profile) {
  const storeNameInput =
    document.getElementById("storeNameInput");

  const publicStoreUrl =
    document.getElementById("publicStoreUrl");

  const isPublicCheckbox =
    document.getElementById("isPublicCheckbox");

  if (storeNameInput) {
    storeNameInput.value = profile.store_name || "";
  }

  if (isPublicCheckbox) {
    isPublicCheckbox.checked = !!profile.is_public;
  }

  if (publicStoreUrl) {
    publicStoreUrl.textContent = getPublicStoreUrl();
  }
}

// ==============================
// UTILITY FUNCTION TO GENERATE URL SLUG
// ==============================

function generateSlug(text) {
  return (text || "my-store")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}