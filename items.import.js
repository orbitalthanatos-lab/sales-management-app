// ==============================
// BULK IMPORT LOGIC
// ==============================

import { supabase } from "./supabase.js";
import { parseItemFile } from "./items.logic.js";

// ==============================
// MAIN IMPORT FUNCTION
// ==============================

export async function importFromFolder(files) {
    try {
        const grouped = groupFilesByFolder(files);

        for (const folderName of Object.keys(grouped)) {
            const fileGroup = grouped[folderName];

            // 🔥 1. FIND TXT FILE
            const txtFile = fileGroup.find(f => f.name.toLowerCase() === "data.txt");

            if (!txtFile) {
                console.warn(`Skipping ${folderName} (no data.txt)`);
                continue;
            }

            const text = await readFileAsText(txtFile);

            // 🔥 2. PARSE TXT
            const platforms = parseDataText(text);

            // 🔥 3. UPSERT ITEM (avoid duplicates)
            const { data: itemData, error: itemError } = await supabase
                .from("items")
                .upsert(
                    {
                        custom_id: folderName,
                        status: "Disponible",
                        date_published: new Date().toISOString().split("T")[0]
                    },
                    { onConflict: "custom_id" }
                )
                .select()
                .single();

            if (itemError) throw itemError;

            const itemId = itemData.id;

            // 🔥 4. INSERT PLATFORMS
for (const p of platforms) {

  // 🔍 DEBUG → see what we are sending
  console.log("PLATFORM DATA:", p);

  try {
    await supabase.from("item_platforms").upsert(
      {
        item_id: itemId,
        platform: p.platform,
        title: p.title,
        description: p.description,
        price: parseFloat(p.price) || 0,
        fees: parseFloat(p.fees) || 0,
        buy: 0,
        url: p.url || ""
      },
      { onConflict: "id" }
    );
  } catch (err) {
    console.error("PLATFORM INSERT ERROR:", err);
  }
}

            // 🔥 5. UPLOAD IMAGES
            const imageFiles = fileGroup.filter(f =>
                /\.(jpg|jpeg|png|webp)$/i.test(f.name)
            );

            const uploadedUrls = [];

            for (let file of imageFiles) {
                const filePath = `${itemId}/${Date.now()}_${file.name}`;

                const { error } = await supabase.storage
                    .from("items")
                    .upload(filePath, file);

                if (error) {
                    console.error("Upload error:", error.message);
                    continue;
                }

                const { data } = supabase.storage
                    .from("items")
                    .getPublicUrl(filePath);

                uploadedUrls.push(data.publicUrl);
            }

            // 🔥 6. SAVE IMAGES TO DB
            if (uploadedUrls.length > 0) {
                const { data: existing } = await supabase
                    .from("items")
                    .select("images")
                    .eq("id", itemId)
                    .single();

                const existingImages = existing?.images || [];

                await supabase
                    .from("items")
                    .update({
                        images: [...existingImages, ...uploadedUrls]
                    })
                    .eq("id", itemId);
            }

            console.log(`✅ Imported ${folderName}`);
        }

        alert("Bulk import completed 🚀");

    } catch (err) {
        console.error(err);
        alert("Error during bulk import");
    }
}

// ==============================
//  TXT PARSING
// ==============================

function parseDataText(text) {
  const sections = text.split("=== ").slice(1);

  return sections.map(section => {
    const platform = section.split(" ===")[0].trim().toLowerCase();

    return {
      platform,
      url: extractValue(section, "LINK"),
      title: extractValue(section, "TÍTULO"),
      description: extractValue(section, "DESCRIPCIÓN"),
      price: extractValue(section, "PRECIO"),
      fees: extractValue(section, "COMISION")
    };
  });
}

// ==============================
// VALUE EXTRACTION
// ==============================

function extractValue(text, key) {
  const regex = new RegExp(`\\[${key}[^\\]]*\\][\\s\\S]*?\\n([^\\[]+)`);
  const match = text.match(regex);

  return match ? match[1].trim().replace("€", "") : "";
}

// ==============================
// HELPERS
// ==============================

function groupFilesByFolder(files) {
    const groups = {};

    for (const file of files) {
        const path = file.webkitRelativePath;
        const folder = path.split("/")[0];

        if (!groups[folder]) groups[folder] = [];
        groups[folder].push(file);
    }

    return groups;
}

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}