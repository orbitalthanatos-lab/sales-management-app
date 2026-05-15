import { supabase } from "./supabase.js";
import { detectPlatform, addReminderToPlatform } from "./items.logic.js";
import { showNotification } from "./notification.ui.js";

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
    showNotification("No item ID provided.", "warning");
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
        const idBadge = document.getElementById("itemIdBadge");
        const statusBadge = document.getElementById("itemStatusBadge");

        if (titleEl) {
            titleEl.innerText = "✏️ Edit";
        }

        if (idBadge && currentItem.custom_id) {
            idBadge.innerText = currentItem.custom_id;
        }

        // 🔥 STATUS BADGE
        updateStatusBadge(currentItem.status);

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

        // Load all reminders for this item's platforms
        const platformIds = currentItem.platforms.map(p => p.id);

        const { data: remindersData, error: remindersError } = await supabase
            .from("item_reminders")
            .select("*")
            .in("item_platform_id", platformIds);

        if (remindersError) throw remindersError;

        currentItem.platforms.forEach(p => {
            const platformReminders = (remindersData || [])
                .filter(r => r.item_platform_id === p.id)
                .map(r => ({
                    id: r.id,
                    customerName: r.customer_name || "",
                    contactInfo: r.contact_info || "",
                    productRequested: r.product_requested || "",
                    notes: r.notes || "",
                    dateRequested: r.date_requested || "",
                    completed: r.completed || false,
                    createdAt: r.created_at || ""
                }));

            draft[p.platform] = {
                id: p.id,
                title: p.title || "",
                description: p.description || "",
                price: p.price || 0,
                fees: p.fees || 0,
                buy: p.buy || 0,
                url: p.url || "",
                reminders: platformReminders
            };
        });

        renderImages();
        loadPlatformData();
        setupTabs();
        bindInputs();
        applySmartLogic();
        setupReminderEvents();

    } catch (err) {
        console.error(err);
        showNotification("Error loading item.", "error");
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

    renderReminders();
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

            // 1. Update platform data
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

            // 2. Delete existing reminders for this platform
            if (data.id) {
                await supabase
                    .from("item_reminders")
                    .delete()
                    .eq("item_platform_id", data.id);

                // 3. Insert current reminders
                const reminders = data.reminders || [];

                if (reminders.length > 0) {
                    const rows = reminders.map(reminder => ({
                        item_platform_id: data.id,
                        customer_name: reminder.customerName || "",
                        contact_info: reminder.contactInfo || "",
                        product_requested: reminder.productRequested || "",
                        notes: reminder.notes || "",
                        date_requested: reminder.dateRequested || null,
                        completed: reminder.completed || false
                    }));

                    await supabase
                        .from("item_reminders")
                        .insert(rows);
                }
            }
        }

        // ✅ ONLY use variables that exist here
        currentItem.sold_platform = soldPlatform;
        currentItem.date_sold = dateSold;
        currentItem.date_published = datePublished;

        window.location.href = "index.html";

    } catch (err) {
        console.error(err);
        showNotification("Error saving.", "error");
    }
};

// ==============================
// IMAGES
// ==============================

function renderImages() {
    const container = document.getElementById("imageManager");

    const images = currentItem.images || [];

    container.innerHTML = images.map((img, i) => `
    <div class="edit-image-item">
      <img src="${img}">
      <button class="edit-delete-btn" onclick="deleteImage(${i})">×</button>
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
        showNotification("Error deleting image.", "error");
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
            showNotification("Upload failed.", "error");
        }
    };

    input.click();
};

function updateStatusBadge(status) {
    const statusBadge = document.getElementById("itemStatusBadge");
    if (!statusBadge) return;

    statusBadge.innerText = status;

    statusBadge.classList.remove(
        "status-disponible",
        "status-reservado",
        "status-vendido"
    );

    const s = status.toLowerCase();

    if (s === "disponible") {
        statusBadge.classList.add("status-disponible");
    } else if (s === "reservado") {
        statusBadge.classList.add("status-reservado");
    } else if (s === "vendido") {
        statusBadge.classList.add("status-vendido");
    }
}

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
        updateStatusBadge(currentItem.status);
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
// REMINDERS
// ==============================

function renderReminders() {
    const container = document.getElementById("remindersList");

    if (!container) return;

    const reminders =
        draft[currentPlatform]?.reminders || [];

    if (reminders.length === 0) {
        container.innerHTML =
            '<p class="empty-reminders">No reminders yet.</p>';
        return;
    }

    container.innerHTML = reminders
        .map((reminder, index) => `
            <div class="reminder-card">

                <div class="floating-group">
                    <input
                        type="text"
                        value="${reminder.customerName || ""}"
                        onchange="window.updateReminderField(${index}, 'customerName', this.value)"
                        placeholder=" ">
                    <label>Customer Name</label>
                </div>

                <div class="floating-group">
                    <input
                        type="text"
                        value="${reminder.contactInfo || ""}"
                        onchange="window.updateReminderField(${index}, 'contactInfo', this.value)"
                        placeholder=" ">
                    <label>Contact Information</label>
                </div>

                <div class="floating-group">
                    <input
                        type="text"
                        value="${reminder.productRequested || ""}"
                        onchange="window.updateReminderField(${index}, 'productRequested', this.value)"
                        placeholder=" ">
                    <label>Product Requested</label>
                </div>

                <div class="floating-group">
                    <textarea
                        onchange="window.updateReminderField(${index}, 'notes', this.value)"
                        placeholder=" ">${reminder.notes || ""}</textarea>
                    <label>Notes</label>
                </div>

                <div class="edit-grid-2">
                    <div class="floating-group">
                        <input
                            type="date"
                            value="${reminder.dateRequested || ""}"
                            onchange="window.updateReminderField(${index}, 'dateRequested', this.value)"
                            placeholder=" ">
                        <label>Date Requested</label>
                    </div>

                    <div class="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                ${reminder.completed ? "checked" : ""}
                                onchange="window.updateReminderField(${index}, 'completed', this.checked)">
                            Completed
                        </label>
                    </div>
                </div>

                <div class="reminder-actions">
                    <button
                        type="button"
                        class="btn danger"
                        onclick="window.deleteReminder(${index})">
                        Delete Reminder
                    </button>
                </div>

            </div>
        `)
        .join("");
}

window.updateReminderField = (index, field, value) => {
    const reminders =
        draft[currentPlatform]?.reminders || [];

    if (!reminders[index]) return;

    reminders[index][field] = value;
};

window.deleteReminder = (index) => {
    const reminders =
        draft[currentPlatform]?.reminders || [];

    reminders.splice(index, 1);

    renderReminders();
};

function setupReminderEvents() {
    const addReminderBtn =
        document.getElementById("addReminderBtn");

    if (!addReminderBtn) return;

    addReminderBtn.addEventListener("click", () => {
        if (!draft[currentPlatform]) {
            draft[currentPlatform] = {};
        }

        const reminder =
            addReminderToPlatform(draft[currentPlatform]);

        renderReminders();

        console.log("Reminder created:", reminder);
    });
}

// ==============================
// INIT
// ==============================

loadItem();