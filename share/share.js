import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const SUPABASE_URL = "https://iobpblqsqrtfzwyiygbu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlvYnBibHFzcXJ0Znp3eWl5Z2J1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDYwODksImV4cCI6MjA5MjE4MjA4OX0.2bv2oZuF9gvB5IE7LSZ09fVeA7ZgzGWYF4pUO8QTn70";

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    }
);

document.addEventListener("DOMContentLoaded", initSharePage);

/* ==============================
    Share Page Logic
============================== */

async function initSharePage() {
    const items = await getAvailableItems();

    window.shareItems = items;

    renderItems(items);

    setupSearch();
}

/* ==============================
    Search Functionality
============================== */

function setupSearch() {
    const searchInput = document.getElementById("searchInput");

    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const query = searchInput.value
            .trim()
            .toLowerCase();

        const filteredItems = (window.shareItems || []).filter(item => {
            const selectedPlatform =
                item.selected_platform || "wallapop";

            const platformData =
                (item.item_platforms || []).find(
                    platform =>
                        platform.platform === selectedPlatform
                ) || {};

            const title =
                (platformData.title || "").toLowerCase();

            return title.includes(query);
        });

        renderItems(filteredItems);
    });
}

/* ==============================
    Data Fetching and Rendering
============================== */

function getSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);

    return params.get("slug");
}

/* ==============================
    Fetch Public Profile and Items
============================== */

async function getPublicProfile(slug) {
    const { data, error } = await supabase
        .from("public_profiles")
        .select("user_id, public_slug, is_public, store_name")
        .eq("public_slug", slug)
        .eq("is_public", true)
        .single();

    if (error) {
        console.error("Error loading public profile:", error);
        return null;
    }

    return data;
}

/* ==============================
    Fetch Available Items
============================== */

async function getAvailableItems() {
    const slug = getSlugFromUrl();

    if (!slug) {
        console.error("No public slug provided in URL.");
        return [];
    }

    const profile = await getPublicProfile(slug);

    if (!profile) {
        console.error("Public profile not found or disabled.");
        return [];
    }

    const { data, error } = await supabase
        .from("items")
        .select(`
            *,
            item_platforms (
                platform,
                title,
                price,
                url
            )
        `)
        .eq("user_id", profile.user_id)
        .order("item_number", { ascending: false });

    if (error) {
        console.error("Error loading items:", error);
        return [];
    }

    return (data || []).filter(item => {
        const status = String(item.status || "")
            .trim()
            .toLowerCase();

        return status === "disponible";
    });
}

/* ==============================
    Render Items
============================== */

function renderItems(items) {
    const grid = document.getElementById("itemsGrid");

    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h2>No available items</h2>
                <p>There are currently no items to display.</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = items.map(createItemCard).join("");
}

/* ==============================
    Create Item Card
============================== */

function createItemCard(item) {
    const selectedPlatform =
        item.selected_platform || "wallapop";

    const platformData =
        (item.item_platforms || []).find(
            platform => platform.platform === selectedPlatform
        ) || {};

    const title =
        platformData.title ||
        "Untitled Item";

    const price =
        formatPrice(platformData.price || 0);

    const image = getImage(item);

    const platformIcons = createPlatformIcons(item.item_platforms || []);

    return `
        <article class="share-card">
            <img
                class="share-card-image"
                src="${image}"
                alt="${escapeHtml(title)}"
            />

            ${platformIcons}

            <div class="share-card-content">
                <h2 class="share-card-title">
                    ${escapeHtml(title)}
                </h2>

                <div class="share-card-price">
                    ${price}
                </div>
            </div>
        </article>
    `;
}

/* ==============================
    Image Handling
============================== */

function getImage(item) {
    if (Array.isArray(item.images) && item.images.length > 0) {
        return item.images[0];
    }

    return "../images/no-image.jpg";
}

function createPlatformIcons(platforms) {
    const supportedPlatforms = [
        {
            name: "wallapop",
            icon: "../images/platforms/wallapop.png"
        },
        {
            name: "vinted",
            icon: "../images/platforms/vinted.png"
        },
        {
            name: "ebay",
            icon: "../images/platforms/ebay.png"
        },
        {
            name: "milanuncios",
            icon: "../images/platforms/milanuncios.png"
        }
    ];

    const icons = supportedPlatforms
        .map(platform => {
            const data = platforms.find(
                item =>
                    item.platform &&
                    item.platform.toLowerCase() === platform.name &&
                    item.url
            );

            if (!data) return "";

            return `
                <a
                    class="share-platform-icon"
                    href="${data.url}"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="${platform.name}"
                >
                    <img
                        class="share-platform-icon-image"
                        src="${platform.icon}"
                        alt="${platform.name}"
                    >
                </a>
            `;
        })
        .join("");

    if (!icons) {
        return "";
    }

    return `
        <div class="share-platform-icons">
            ${icons}
        </div>
    `;
}

/* ==============================
    Utility Functions Price Formatting
============================== */

function formatPrice(value) {
    const number = Number(value || 0);

    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR"
    }).format(number);
}

/* ==============================
    Utility Function HTML Escaping
============================== */

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
}