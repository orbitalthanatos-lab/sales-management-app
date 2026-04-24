import { calculateStats } from "./items.logic.js";
import { createCard } from "./ui.components.js";
import { supabase } from "./supabase.js";

function setCardHighlight(id, type) {
    const el = document.getElementById(id);
    if (!el) return;

    el.classList.remove("highlight-green", "highlight-red", "highlight-blue");

    if (type === "green") el.classList.add("highlight-green");
    if (type === "red") el.classList.add("highlight-red");
    if (type === "blue") el.classList.add("highlight-blue");
}

let items = [];

async function loadItems() {
    try {
        // 1️⃣ Get items
        const { data: itemsData, error: itemsError } = await supabase
            .from("items")
            .select("*");

        if (itemsError) throw itemsError;

        // 2️⃣ Get platforms
        const { data: platformsData, error: platformsError } = await supabase
            .from("item_platforms")
            .select("*");

        if (platformsError) throw platformsError;

        // 3️⃣ Build items structure (same as script.js)
        items = itemsData.map(item => {
            const platformData = {};
            const links = {};

            platformsData
                .filter(p => p.item_id === item.id)
                .forEach(p => {
                    platformData[p.platform] = {
                        title: p.title,
                        description: p.description,
                        price: p.price,
                        fees: p.fees,
                        buy: p.buy
                    };

                    links[p.platform] = p.url || "";
                });

            return {
                ...item,
                selectedPlatform: item.selected_platform || "wallapop",
                soldPlatform: item.sold_platform || "",
                datePublished: item.date_published || "",
                dateSold: item.date_sold || "",
                platformData,
                links,
                images: item.images || []
            };
        });

        renderDashboard();

    } catch (err) {
        console.error("Dashboard load error:", err);
    }
}

function renderDashboard() {

    const stats = calculateStats(items);

    const container = document.getElementById("dashboardStats");

    container.innerHTML = `
    ${createCard({ id: "d_totalProfit", title: "💰 Beneficio total", valueId: "d_totalProfit_val" })}
    ${createCard({ id: "d_bestPlatform", title: "🏆 Mejor plataforma", valueId: "d_bestPlatform_val" })}
    ${createCard({ id: "d_bestSale", title: "🔥 Mejor venta", valueId: "d_bestSale_val" })}
    ${createCard({ id: "d_slowItems", title: "⏳ Items lentos (+10 días)", valueId: "d_slowItems_val" })}

    ${createCard({ id: "d_inventory", title: "📦 Inventario", valueId: "d_inventory_val" })}
    ${createCard({ id: "d_topSales", title: "🏅 Top 3 ventas", valueId: "d_topSales_val" })}
    ${createCard({ id: "d_priceDrop", title: "⚠️ Bajar precio", valueId: "d_priceDrop_val" })}
    ${createCard({ id: "d_avgTime", title: "⏱ Tiempo medio venta", valueId: "d_avgTime_val" })}

    ${createCard({ id: "d_oldest", title: "📦 Más antiguo", valueId: "d_oldest_val" })}
    ${createCard({ id: "d_roi", title: "💸 ROI", valueId: "d_roi_val" })}
    ${createCard({ id: "d_invested", title: "💳 Total invertido", valueId: "d_invested_val" })}
    ${createCard({ id: "d_avgSale", title: "📊 Media por venta", valueId: "d_avgSale_val" })}

    ${createCard({ id: "d_inventoryValue", title: "📦 Valor inventario", valueId: "d_inventoryValue_val" })}
    ${createCard({ id: "d_salesMonth", title: "📅 Ventas este mes", valueId: "d_salesMonth_val" })}
    `;

    // ============================
    // CALCULATIONS
    // ============================

    // Filtrar solo vendidos
    const soldItems = items.filter(i => i.status === "Vendido");

    // Beneficio total
    const getProfit = (item) => {
        const platform =
            item.status === "Vendido"
                ? item.soldPlatform || item.selectedPlatform || "wallapop"
                : item.selectedPlatform || "wallapop";

        const data = item.platformData?.[platform];
        if (!data) return 0;

        return (data.price || 0) - (data.buy || 0) - (data.fees || 0);
    };

    const totalProfit = soldItems.reduce((sum, i) => sum + getProfit(i), 0);

    // Mejor venta
    const bestSale = soldItems.reduce((max, i) => {
        return getProfit(i) > getProfit(max || {}) ? i : max;
    }, null);

    // Conteo por plataforma
    const platformCount = {};
    soldItems.forEach(i => {
        if (!i.soldPlatform) return;
        platformCount[i.soldPlatform] = (platformCount[i.soldPlatform] || 0) + 1;
    });

    // Mejor plataforma
    const bestPlatform = Object.entries(platformCount)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

    // Items lentos
    const slowItems = items.filter(i => {
        if (!i.datePublished) return false;
        const days = Math.floor((new Date() - new Date(i.datePublished)) / (1000 * 60 * 60 * 24));
        return days > 10 && i.status !== "Vendido";
    }).length;

    // Average time to sell
    const avgTime = soldItems.length > 0
        ? Math.round(
            soldItems.reduce((sum, i) => {
                if (!i.dateSold || !i.datePublished) return sum;
                return sum + (new Date(i.dateSold) - new Date(i.datePublished));
            }, 0) / soldItems.length / (1000 * 60 * 60 * 24)
        )
        : 0;

    // Top 3 sales
    const topSales = [...soldItems]
        .sort((a, b) => getProfit(b) - getProfit(a))
        .slice(0, 3);

    // Items to drop price (>15 days unsold)
    const priceDrop = items.filter(i => {
        if (!i.datePublished || i.status === "Vendido") return false;
        const days = Math.floor((new Date() - new Date(i.datePublished)) / (1000 * 60 * 60 * 24));
        return days > 15;
    }).length;

    // Oldest item
    const oldestItem = items.reduce((oldest, i) => {
        if (!i.datePublished) return oldest;
        return (!oldest || new Date(i.datePublished) < new Date(oldest.datePublished)) ? i : oldest;
    }, null);

    // ROI
    const totalInvested = items.reduce((sum, item) => {
        const platform = item.selectedPlatform || "wallapop";
        const data = item.platformData?.[platform];
        return sum + (data?.buy || 0);
    }, 0);
    const roi = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0;

    // Avg sale
    const avgSale = soldItems.length > 0
        ? totalProfit / soldItems.length
        : 0;

    // Inventory value
    const inventoryValue = items.reduce((sum, i) => {
        return i.status !== "Vendido" ? sum + getProfit(i) : sum;
    }, 0);

    // Sales this month
    const now = new Date();
    const salesMonth = soldItems.filter(i => {
        if (!i.dateSold) return false;
        const d = new Date(i.dateSold);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    // ============================
    // SMART INSIGHTS
    // ============================

    // Best performer → highest profit
    if (totalProfit > 0) {
        setCardHighlight("d_totalProfit", "green");
    }

    // Best platform highlight
    if (bestPlatform !== "-") {
        setCardHighlight("d_bestPlatform", "blue");
    }

    // Best sale highlight
    if (bestSale) {
        setCardHighlight("d_bestSale", "green");
    }

    // Slow items warning
    if (slowItems > 0) {
        setCardHighlight("d_slowItems", "red");
    }

    // Price drop warning
    if (priceDrop > 0) {
        setCardHighlight("d_priceDrop", "red");
    }

    // ROI
    if (roi > 50) setCardHighlight("d_roi", "green");
    else if (roi < 10 && totalInvested > 0) setCardHighlight("d_roi", "red");

    // Inventory value
    if (inventoryValue > 0) {
        setCardHighlight("d_inventoryValue", "blue");
    }

    // Sales this month
    if (salesMonth > 0) {
        setCardHighlight("d_salesMonth", "green");
    }

    // Avg sale
    if (avgSale > 0) {
        setCardHighlight("d_avgSale", "blue");
    }

    // ============================
    // RENDER VALUES
    // ============================

    document.getElementById("d_totalProfit_val").innerText = totalProfit.toFixed(2) + " €";
    document.getElementById("d_bestPlatform_val").innerText =
        bestPlatform !== "-" ? bestPlatform.toUpperCase() : "No data";
    document.getElementById("d_bestSale_val").innerText = bestSale?.platformData?.wallapop?.title || "-";
    document.getElementById("d_slowItems_val").innerText =
        slowItems > 0 ? `${slowItems} slow items` : "Fast selling";
    document.getElementById("d_inventory_val").innerText = items.length;
    document.getElementById("d_avgTime_val").innerText = avgTime;
    document.getElementById("d_topSales_val").innerText =
        topSales.map((i, idx) =>
            `${idx + 1}. ${i.platformData?.wallapop?.title?.slice(0, 20)}`
        ).join(" | ") || "-";
    document.getElementById("d_priceDrop_val").innerText =
        priceDrop > 0 ? `${priceDrop} items need price drop` : "All good";
    document.getElementById("d_oldest_val").innerText =
        oldestItem?.platformData?.wallapop?.title || "-";
    document.getElementById("d_roi_val").innerText =
        roi > 0 ? `${roi.toFixed(1)} % ROI` : "No investment yet";
    document.getElementById("d_invested_val").innerText = totalInvested.toFixed(2) + " €";
    document.getElementById("d_avgSale_val").innerText = avgSale.toFixed(2) + " €";
    document.getElementById("d_inventoryValue_val").innerText = inventoryValue.toFixed(2) + " €";
    document.getElementById("d_salesMonth_val").innerText =
        salesMonth > 0 ? `${salesMonth} sales` : "No sales yet";
}

// INIT
loadItems();