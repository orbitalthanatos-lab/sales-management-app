import { supabase } from "../supabase.js";

document.addEventListener("DOMContentLoaded", initSharePage);

async function initSharePage() {
    const items = await getAvailableItems();

    window.shareItems = items;

    renderItems(items);

    setupSearch();
}

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

async function getAvailableItems() {
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
        .eq("status", "Disponible")
        .order("item_number", { ascending: false });

    if (error) {
        console.error("Error loading items:", error);
        return [];
    }

    return data || [];
}

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

function formatPrice(value) {
    const number = Number(value || 0);

    return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR"
    }).format(number);
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text || "";
    return div.innerHTML;
}