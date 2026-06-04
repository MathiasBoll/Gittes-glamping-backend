const seedRegistry = require("../seedRegistry");

// Fjerner MongoDB-genererede felter som ikke skal overskrives ved upsert
function sanitizeRecords(records) {
    return records.map((record) => {
        const { _id, id, __v, created, updatedAt, createdAt, ...rest } = record;
        return rest;
    });
}

// Henter en numerisk tæller fra MongoDB's bulkWrite-resultat
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

// Bygger et filter-objekt baseret på uniqueBy-felterne
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

// Kerne-funktion: importerer ét type med bulkWrite (upsert)
async function importSingleType(type, records) {
    const entry = seedRegistry[type];

    if (!entry) {
        return {
            ok: false,
            status: 400,
            result: {
                type,
                message: `Unknown import type: ${type}`,
            },
        };
    }

    if (!Array.isArray(records)) {
        return {
            ok: false,
            status: 400,
            result: {
                type,
                message: "Request body must be an array",
            },
        };
    }

    const uniqueBy = Array.isArray(entry.uniqueBy) ? entry.uniqueBy : [];

    if (uniqueBy.length === 0) {
        return {
            ok: false,
            status: 500,
            result: {
                type,
                message: `No uniqueBy configuration found for type: ${type}`,
            },
        };
    }

    const cleanRecords = sanitizeRecords(records);
    const failedItems = [];
    const operationMap = [];

    cleanRecords.forEach((record, index) => {
        const filterResult = buildFilter(record, uniqueBy);

        if (!filterResult.ok) {
            failedItems.push({
                index,
                item: record,
                error: filterResult.error,
            });
            return;
        }

        operationMap.push({
            sourceIndex: index,
            operation: {
                updateOne: {
                    filter: filterResult.filter,
                    update: { $set: record },
                    upsert: true, // Opret hvis ikke eksisterer, opdater hvis eksisterer
                },
            },
        });
    });

    if (operationMap.length === 0) {
        return {
            ok: failedItems.length === 0,
            status: failedItems.length === 0 ? 201 : 207,
            result: {
                type,
                sent: cleanRecords.length,
                saved: 0,
                failed: failedItems.length,
                failedItems,
                inserted: 0,
                updated: 0,
            },
        };
    }

    try {
        const bulkOps = operationMap.map((item) => item.operation);
        const writeResult = await entry.model.bulkWrite(bulkOps, { ordered: false });

        const inserted = getCount(writeResult, ["upsertedCount", "upserted"]);
        const updated = getCount(writeResult, ["modifiedCount", "nModified"]);
        const saved = operationMap.length;

        return {
            ok: failedItems.length === 0,
            status: failedItems.length === 0 ? 201 : 207,
            result: {
                type,
                sent: cleanRecords.length,
                saved,
                failed: failedItems.length,
                failedItems,
                inserted,
                updated,
            },
        };
    } catch (error) {
        const writeErrors = Array.isArray(error?.writeErrors) ? error.writeErrors : [];
        const failedOperationIndexes = new Set();

        writeErrors.forEach((writeError) => {
            const opIndex = writeError.index;
            const mapped = operationMap[opIndex];

            if (!mapped) {
                return;
            }

            failedOperationIndexes.add(opIndex);
            failedItems.push({
                index: mapped.sourceIndex,
                item: cleanRecords[mapped.sourceIndex],
                error: writeError.errmsg || writeError.message || "Unknown bulk write error",
            });
        });

        const partialResult = error?.result;
        const inserted = getCount(partialResult, ["upsertedCount", "upserted"]);
        const updated = getCount(partialResult, ["modifiedCount", "nModified"]);
        const saved = operationMap.length - failedOperationIndexes.size;

        return {
            ok: false,
            status: 207,
            result: {
                type,
                sent: cleanRecords.length,
                saved: saved < 0 ? 0 : saved,
                failed: failedItems.length,
                failedItems,
                inserted,
                updated,
                message: "Import completed with some errors",
            },
        };
    }
}

// Handler for POST /bulk/:type — importerer én type ad gangen
async function bulkImportByType(req, res) {
    const type = req.params.type;
    const outcome = await importSingleType(type, req.body);

    return res.status(outcome.status).json(outcome.result);
}

// Handler for POST /bulk-all — importerer alle typer i ét kald
async function bulkImportAll(req, res) {
    const payload = req.body;

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return res.status(400).json({
            message: "Request body must be an object with arrays by type",
            example: {
                stays: [],
                activities: [],
                reviews: [],
            },
        });
    }

    const requestedTypes = Object.keys(payload);

    if (requestedTypes.length === 0) {
        return res.status(400).json({ message: "No types provided in request body" });
    }

    const results = [];
    let totalSent = 0;
    let totalSaved = 0;
    let totalFailed = 0;

    // Kør import for hver type i rækkefølge
    for (const type of requestedTypes) {
        const outcome = await importSingleType(type, payload[type]);
        results.push(outcome.result);

        if (typeof outcome.result.sent === "number") {
            totalSent += outcome.result.sent;
        }

        if (typeof outcome.result.saved === "number") {
            totalSaved += outcome.result.saved;
        }

        if (typeof outcome.result.failed === "number") {
            totalFailed += outcome.result.failed;
        }
    }

    const hasErrors = results.some((result) => result.failed > 0 || result.message?.startsWith("Unknown import type"));

    return res.status(hasErrors ? 207 : 201).json({
        message: "Bulk import finished",
        totals: {
            sent: totalSent,
            saved: totalSaved,
            failed: totalFailed,
        },
        results,
    });
}

module.exports = {
    bulkImportByType,
    bulkImportAll,
};
