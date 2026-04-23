import { supabase } from "./supabase.js";
import { detectPlatform } from "./items.logic.js";

let currentItem = null;
let currentPlatform = "wallapop";

let draft = {
    wallapop: {},
    vinted: {},
    milanuncios: {}
};

// Get item ID from URL
const params = new URLSearchParams(window.location.search);
const itemId = params.get("id");

if (!itemId) {
    alert("No item ID provided");
    window.location.href = "index.html";
}

// ==============================
// LOAD ITEM
// ==============================

async function loadItem() {
    try {
        const { data: item, error: itemError } = await supabase
            .from("items")
            .select("*")
            .eq("id", itemId)
            .single();

        if (itemError) throw itemError;

        const { data: platforms, error: platformError } = await supabase
            .from("item_platforms")
            .select("*")
            .eq("item_id", itemId);

        if (platformError) throw platformError;

        currentItem = {
            ...item,
            platforms,
            images: item.images || []
        };

        const titleEl = document.getElementById("editTitle");
        const badgeEl = document.getElementById("itemIdBadge");

        if (currentItem.custom_id) {
            if (titleEl) titleEl.innerText = `Edit Item`;
            if (badgeEl) badgeEl.innerText = currentItem.custom_id;
        }

        const allPlatforms = ["wallapop", "vinted", "milanuncios"];

        for (const p of allPlatforms) {
            if (!currentItem.platforms.find(x => x.platform === p)) {

                await supabase.from("item_platforms").insert([{
                    item_id: currentItem.id,
                    platform: p,
                    title: "",
                    description: "",
                    price: 0,
                    fees: 0,
                    buy: 0
                }]);

                // also update local state
                draft[p] = {
                    title: "",
                    description: "",
                    price: 0,
                    fees: 0,
                    buy: 0
                };
            }
        }

        const { data: updatedPlatforms } = await supabase
            .from("item_platforms")
            .select("*")
            .eq("item_id", itemId);

        currentItem.platforms = updatedPlatforms;

        currentItem.platforms.forEach(p => {
            draft[p.platform] = {
                title: p.title || "",
                description: p.description || "",
                price: p.price || 0,
                fees: p.fees || 0,
                buy: p.buy || 0,
                url: p.url || ""
            };
        });

        renderImages();
        loadPlatformData();
        setupTabs();
        bindInputs();
        applySmartLogic();

    } catch (err) {
        console.error(err);
        alert("Error loading item");
    }
}

// ==============================
// LOAD PLATFORM DATA
// ==============================

function loadPlatformData() {
    const data = draft[currentPlatform] || {};

    document.getElementById("title").value = data.title ?? "";
    document.getElementById("description").value = data.description ?? "";

    document.getElementById("price").value = data.price ?? "";
    document.getElementById("fees").value = data.fees ?? "";
    document.getElementById("buy").value = draft[currentPlatform]?.buy ?? "";

    document.getElementById("status").value = currentItem.status ?? "Disponible";

    document.getElementById("soldPlatform").value =
        currentItem.sold_platform ?? "";

    document.getElementById("datePublished").value =
        currentItem.date_published ?? "";

    document.getElementById("dateSold").value =
        currentItem.date_sold ?? "";

    document.getElementById("url").value =
        draft[currentPlatform]?.url || "";
}

// ==============================
// TABS
// ==============================

function setupTabs() {
    const tabs = document.querySelectorAll(".tab");

    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            const platform = tab.dataset.tab;

            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            currentPlatform = platform;
            loadPlatformData();
        });
    });
}

// ==============================
// SAVE ITEM
// ==============================

window.saveItem = async () => {
    try {
        const status = document.getElementById("status").value;

        let soldPlatform = null;

        if (status === "Vendido") {
            soldPlatform =
                document.getElementById("soldPlatform")?.value || null;
        }

        const datePublished =
            document.getElementById("datePublished")?.value || null;

        let dateSold = null;

        if (status === "Vendido") {
            dateSold =
                document.getElementById("dateSold")?.value || null;
        }

        // 🔥 UPDATE MAIN ITEM
        await supabase
            .from("items")
            .update({
                status,
                sold_platform: soldPlatform,
                date_published: datePublished,
                date_sold: dateSold
            })
            .eq("id", currentItem.id);

        // 🔥 UPDATE ALL PLATFORMS
        for (const platform of Object.keys(draft)) {
            const data = draft[platform];

            await supabase
                .from("item_platforms")
                .update({
                    title: data.title,
                    description: data.description,
                    price: data.price,
                    fees: data.fees,
                    buy: data.buy,
                    url: data.url
                })
                .eq("item_id", currentItem.id)
                .eq("platform", platform);
        }

        // ✅ ONLY use variables that exist here
        currentItem.sold_platform = soldPlatform;
        currentItem.date_sold = dateSold;
        currentItem.date_published = datePublished;

        // alert("Saved all platforms ✅");
        window.location.href = "index.html";

    } catch (err) {
        console.error(err);
        alert("Error saving");
    }
};

// ==============================
// IMAGES
// ==============================

function renderImages() {
    const container = document.getElementById("imageManager");

    const images = currentItem.images || [];

    container.innerHTML = images.map((img, i) => `
    <div class="image-item">
      <img src="${img}">
      <button class="delete-btn" onclick="deleteImage(${i})">×</button>
    </div>
  `).join("");
}

window.deleteImage = async (index) => {
    try {
        const images = currentItem.images || [];
        const imageToDelete = images[index];

        // 1️⃣ Remove from array
        const updatedImages = images.filter((_, i) => i !== index);

        // 2️⃣ Update DB
        await supabase
            .from("items")
            .update({ images: updatedImages })
            .eq("id", currentItem.id);

        // 3️⃣ Delete from storage (important!)
        if (imageToDelete) {
            const path = imageToDelete.split("/items/")[1];

            if (path) {
                await supabase.storage
                    .from("items")
                    .remove([path]);
            }
        }

        // 4️⃣ Update UI
        currentItem.images = updatedImages;
        renderImages();

    } catch (err) {
        console.error(err);
        alert("Error deleting image");
    }
};

// ==============================
// UPLOAD IMAGES (EDIT PAGE)
// ==============================

window.uploadImages = () => {
    const input = document.getElementById("imageUploadInput");

    input.value = "";

    input.onchange = async () => {
        const files = Array.from(input.files);
        if (!files.length) return;

        try {
            for (let file of files) {

                const filePath = `${currentItem.id}/${Date.now()}_${file.name}`;

                // 1️⃣ Upload to storage
                const { error } = await supabase.storage
                    .from("items")
                    .upload(filePath, file);

                if (error) throw error;

                // 2️⃣ Get public URL
                const { data } = supabase.storage
                    .from("items")
                    .getPublicUrl(filePath);

                const imageUrl = data.publicUrl;

                // 3️⃣ Get current images from DB
                const { data: itemData } = await supabase
                    .from("items")
                    .select("images")
                    .eq("id", currentItem.id)
                    .single();

                const existingImages = itemData.images || [];

                // 4️⃣ Save instantly to DB
                await supabase
                    .from("items")
                    .update({
                        images: [...existingImages, imageUrl]
                    })
                    .eq("id", currentItem.id);

                // 5️⃣ Update UI
                currentItem.images = [...existingImages, imageUrl];
            }

            renderImages();

        } catch (err) {
            console.error(err);
            alert("Upload failed");
        }
    };

    input.click();
};

// ==============================
// INPUT BINDINGS
// ==============================

function bindInputs() {
    document.getElementById("title").addEventListener("input", e => {
        draft[currentPlatform].title = e.target.value;
    });

    document.getElementById("description").addEventListener("input", e => {
        draft[currentPlatform].description = e.target.value;
    });

    document.getElementById("price").addEventListener("input", e => {
        draft[currentPlatform].price = parseFloat(e.target.value) || 0;
    });

    document.getElementById("fees").addEventListener("input", e => {
        draft[currentPlatform].fees = parseFloat(e.target.value) || 0;
    });

    document.getElementById("buy").addEventListener("input", e => {
        draft[currentPlatform].buy = parseFloat(e.target.value) || 0;
    });

    document.getElementById("status").addEventListener("change", e => {
        currentItem.status = e.target.value;
        applySmartLogic();
    });

    document.getElementById("soldPlatform").addEventListener("change", e => {
        currentItem.sold_platform = e.target.value || null;
    });

    document.getElementById("dateSold").addEventListener("change", e => {
        currentItem.date_sold = e.target.value || null;
    });

    document.getElementById("url").addEventListener("input", e => {
        const url = e.target.value;

        // Save normally
        draft[currentPlatform].url = url;

        // 🔥 DETECT PLATFORM
        const detected = detectPlatform(url);

        if (detected && detected !== currentPlatform) {

            // Save current tab data first
            draft[currentPlatform].url = url;

            // Switch platform
            currentPlatform = detected;

            // Update active tab UI
            document.querySelectorAll(".tab").forEach(t => {
                t.classList.remove("active");
            });

            const newTab = document.querySelector(`[data-tab="${detected}"]`);
            if (newTab) newTab.classList.add("active");

            // Reload inputs for new platform
            loadPlatformData();
        }
    });
}

// ==============================
// SMART LOGIC ON STATUS CHANGE AND PRICE CHANGE
// ==============================

function applySmartLogic() {
    const status = document.getElementById("status").value;

    const soldPlatformEl = document.getElementById("soldPlatform");
    const dateSoldEl = document.getElementById("dateSold");

    const priceEl = document.getElementById("price");
    const buyEl = document.getElementById("buy");
    const feesEl = document.getElementById("fees");

    // =========================
    // WHEN SOLD
    // =========================
    if (status === "Vendido") {

        if (soldPlatformEl && !soldPlatformEl.value) {
            soldPlatformEl.value = currentPlatform;
        }

        if (dateSoldEl && !dateSoldEl.value) {
            const today = new Date().toISOString().split("T")[0];
            dateSoldEl.value = today;
        }

        // 👉 SAVE INTO STATE
        currentItem.sold_platform = soldPlatformEl.value;
        currentItem.date_sold = dateSoldEl.value;

        // Lock fields
        priceEl.disabled = true;
        buyEl.disabled = true;
        feesEl.disabled = true;

        soldPlatformEl.disabled = false;
        dateSoldEl.disabled = false;
    }

    // =========================
    // NOT SOLD
    // =========================

    else {
        priceEl.disabled = false;
        buyEl.disabled = false;
        feesEl.disabled = false;

        // 🔥 CLEAR STATE
        currentItem.sold_platform = null;
        currentItem.date_sold = null;

        // 🔥 CLEAR UI
        if (soldPlatformEl) {
            soldPlatformEl.value = "";
            soldPlatformEl.disabled = true;
        }

        if (dateSoldEl) {
            dateSoldEl.value = "";
            dateSoldEl.disabled = true;
        }
    }

}

// ==============================
// INIT
// ==============================

loadItem();