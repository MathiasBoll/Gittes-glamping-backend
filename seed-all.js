const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const seedRegistry = require("./seedRegistry");

require("dotenv").config({ path: path.join(__dirname, ".env") });

function readJSON(fileName) {
    const filePath = path.join(__dirname, fileName);

    if (!fs.existsSync(filePath)) {
        return [];
    }

    const fileText = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileText);
}

function sanitizeRecords(records) {
    return records.map((record) => {
        const { _id, id, __v, created, updatedAt, createdAt, ...rest } = record;
        return rest;
    });
}

function getCount(result, keys) {
    for (const key of keys) {
        if (typeof result?.[key] === "number") {
            return result[key];
        }

        if (typeof result?.result?.[key] === "number") {
            return result.result[key];
        }
    }

    return 0;
}

function buildFilter(record, uniqueBy) {
    const missingFields = uniqueBy.filter(
        (field) => record[field] === undefined || record[field] === null || record[field] === ""
    );

    if (missingFields.length > 0) {
        return {
            ok: false,
            error: `Missing unique field(s): ${missingFields.join(", ")}`,
        };
    }

    const filter = {};

    for (const field of uniqueBy) {
        filter[field] = record[field];
    }

    return { ok: true, filter };
}

async function importType(type, entry) {
    const source = readJSON(entry.fileName);

    if (!Array.isArray(source)) {
        console.log(`[${type}] Skipped: ${entry.fileName} is not an array`);
        return { sent: 0, saved: 0, failed: 0 };
    }

    if (source.length === 0) {
        console.log(`[${type}] Skipped: ${entry.fileName} is empty`);
        return { sent: 0, saved: 0, failed: 0 };
    }

    const uniqueBy = Array.isArray(entry.uniqueBy) ? entry.uniqueBy : [];

    if (uniqueBy.length === 0) {
        console.log(`[${type}] Skipped: no uniqueBy configuration found`);
        return { sent: source.length, saved: 0, failed: source.length };
    }

    const records = sanitizeRecords(source);
    const operationMap = [];
    let preValidationFailed = 0;

    records.forEach((record, index) => {
        const filterResult = buildFilter(record, uniqueBy);

        if (!filterResult.ok) {
            preValidationFailed += 1;
            console.log(`[${type}] Skipped record ${index}: ${filterResult.error}`);
            return;
        }

        operationMap.push({
            sourceIndex: index,
            operation: {
                updateOne: {
                    filter: filterResult.filter,
                    update: { $set: record },
                    upsert: true,
                },
            },
        });
    });

    if (operationMap.length === 0) {
        return { sent: records.length, saved: 0, failed: preValidationFailed };
    }

    try {
        const result = await entry.model.bulkWrite(
            operationMap.map((item) => item.operation),
            { ordered: false }
        );

        const inserted = getCount(result, ["upsertedCount", "upserted"]);
        const updated = getCount(result, ["modifiedCount", "nModified"]);
        const saved = operationMap.length;
        const failed = preValidationFailed;

        console.log(
            `[${type}] Imported ${saved}/${records.length} (inserted: ${inserted}, updated: ${updated}, failed: ${failed})`
        );

        return { sent: records.length, saved, failed };
    } catch (error) {
        const writeErrors = Array.isArray(error?.writeErrors) ? error.writeErrors : [];
        const failedOperationIndexes = new Set(writeErrors.map((item) => item.index));
        const failed = preValidationFailed + failedOperationIndexes.size;
        const saved = operationMap.length - failedOperationIndexes.size;

        const partialResult = error?.result;
        const inserted = getCount(partialResult, ["upsertedCount", "upserted"]);
        const updated = getCount(partialResult, ["modifiedCount", "nModified"]);

        console.log(
            `[${type}] Imported ${saved < 0 ? 0 : saved}/${records.length} (inserted: ${inserted}, updated: ${updated}, failed: ${failed})`
        );

        return {
            sent: records.length,
            saved: saved < 0 ? 0 : saved,
            failed,
        };
    }
}

async function run() {
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is missing. Add it to your .env file before seeding.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    let totalSent = 0;
    let totalSaved = 0;
    let totalFailed = 0;

    for (const [type, entry] of Object.entries(seedRegistry)) {
        const result = await importType(type, entry);
        totalSent += result.sent;
        totalSaved += result.saved;
        totalFailed += result.failed;
    }

    await mongoose.disconnect();

    console.log("Seed finished");
    console.log(`Sent: ${totalSent}, Saved: ${totalSaved}, Failed: ${totalFailed}`);
}

run().catch(async (error) => {
    console.error("Seed failed:", error.message);
    try {
        await mongoose.disconnect();
    } catch (_err) {
        // Ignore disconnect errors on failure path.
    }
    process.exit(1);
});
