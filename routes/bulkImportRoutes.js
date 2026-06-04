const express = require("express");
const router = express.Router();

const {
    bulkImportByType,
    bulkImportAll,
} = require("../handlers/bulkImportHandler");

// POST /bulk/:type  — importerer én type (stays, activities eller reviews)
router.post("/bulk/:type", bulkImportByType);

// POST /bulk-all    — importerer alle typer i ét samlet kald
router.post("/bulk-all", bulkImportAll);

module.exports = router;
