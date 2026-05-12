import { supabase } from "./supabase.js";
import { showNotification } from "./notification.ui.js";

// ==============================
// CHECK IF USER IS LOGGED IN
// ==============================

const { data } = await supabase.auth.getUser();

if (data.user) {
  window.location.href = "index.html";
}

// ==============================
// LOGIN WITH EMAIL
// ==============================

document.getElementById("loginBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    showNotification(error.message, "error");
  } else {
    window.location.href = "index.html";
  }
});

// ==============================
// SIGN UP (simple toggle)
// ==============================

document.getElementById("signupBtn").addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error) {
    showNotification(error.message, "error");
  } else {
    showNotification(
      "Check your email to confirm signup.",
      "success",
      5000
);
  }
});

// ==============================
// GOOGLE LOGIN
// ==============================

document.getElementById("googleBtn").addEventListener("click", async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + "/index.html"
    }
  });
});