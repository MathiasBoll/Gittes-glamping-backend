const fs = require("fs");
const path = require("path");
const seedRegistry = require("./seedRegistry");

const OUTPUT_FILE = "postman-bulk-all-body.json";

function readJsonArray(fileName) {
    const filePath = path.join(__dirname, fileName);

    if (!fs.existsSync(filePath)) {
        console.warn(`Skipping ${fileName}: file not found`);
        return [];
    }

    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
        console.warn(`Skipping ${fileName}: JSON root must be an array`);
        return [];
    }

    return parsed;
}

function buildPayload() {
    const payload = {};

    for (const [type, entry] of Object.entries(seedRegistry)) {
        payload[type] = readJsonArray(entry.fileName);
    }

    return payload;
}

function writePayload(payload) {
    const outputPath = path.join(__dirname, OUTPUT_FILE);
    fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    return outputPath;
}

function main() {
    const payload = buildPayload();
    const outputPath = writePayload(payload);

    const totals = Object.values(payload).reduce(
        (sum, arr) => sum + arr.length,
        0
    );

    console.log(`Built ${OUTPUT_FILE} with ${totals} total records`);
    console.log(`Saved to: ${outputPath}`);
}

main();
