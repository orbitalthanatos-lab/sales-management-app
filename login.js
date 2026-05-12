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

// ==============================
// LOGIN SHOWCASE CAROUSEL
// ==============================

const showcaseSlides = [
  {
    title: "Manage Your Business Beautifully Organized",
    description:
      "Track products, inventory, sales, and public storefronts from one powerful cloud-based dashboard."
  },
  {
    title: "Control All Your Products in One Place",
    description:
      "Organize categories, prices, stock, and images with an intuitive interface."
  },
  {
    title: "Upload Images and Extract Data Automatically",
    description:
      "Use OCR and AI prompts to process invoices, receipts, and product information."
  },
  {
    title: "Access Your Data Anywhere",
    description:
      "Secure cloud synchronization powered by Supabase."
  },
  {
    title: "Share Your Public Storefront",
    description:
      "Publish products online and share your store link with customers instantly."
  }
];

const showcaseTitle =
  document.getElementById("showcaseTitle");

const showcaseDescription =
  document.getElementById("showcaseDescription");

const showcaseDots =
  document.querySelectorAll(".login-dot");

let currentSlideIndex = 0;
let showcaseIntervalId = null;

function renderShowcaseSlide(index) {
  if (!showcaseTitle || !showcaseDescription) return;

  const slide = showcaseSlides[index];

  showcaseTitle.textContent = slide.title;
  showcaseDescription.textContent = slide.description;

  showcaseDots.forEach((dot, dotIndex) => {
    dot.classList.toggle(
      "active",
      dotIndex === index
    );
  });
}

function goToNextSlide() {
  currentSlideIndex =
    (currentSlideIndex + 1) %
    showcaseSlides.length;

  renderShowcaseSlide(currentSlideIndex);
}

function restartShowcaseCarousel() {
  if (showcaseIntervalId) {
    clearInterval(showcaseIntervalId);
  }

  showcaseIntervalId = setInterval(
    goToNextSlide,
    5000
  );
}

function setupShowcaseDots() {
  showcaseDots.forEach((dot, dotIndex) => {
    dot.addEventListener("click", () => {
      currentSlideIndex = dotIndex;
      renderShowcaseSlide(currentSlideIndex);
      restartShowcaseCarousel();
    });
  });
}

function startShowcaseCarousel() {
  if (!showcaseTitle || !showcaseDescription) return;

  renderShowcaseSlide(currentSlideIndex);
  setupShowcaseDots();
  restartShowcaseCarousel();
}

startShowcaseCarousel();

// ==============================
// SHOW / HIDE PASSWORD
// ==============================

const passwordInput =
  document.getElementById("password");

const togglePasswordBtn =
  document.getElementById("togglePasswordBtn");

if (passwordInput && togglePasswordBtn) {
  togglePasswordBtn.addEventListener("click", () => {
    const isHidden =
      passwordInput.type === "password";

    passwordInput.type =
      isHidden ? "text" : "password";

    togglePasswordBtn.textContent =
      isHidden ? "🙈" : "👁";

    togglePasswordBtn.setAttribute(
      "aria-label",
      isHidden
        ? "Hide password"
        : "Show password"
    );
  });
}