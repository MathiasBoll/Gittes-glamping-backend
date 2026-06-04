const Stay = require("./models/Stay");
const Activity = require("./models/Activity");
const Review = require("./models/Review");

// seedRegistry definerer hvilke modeller der kan bulk-importeres
// og hvilke felter der bruges som unikke nøgler (til upsert)
module.exports = {
    stays: {
        model: Stay,
        fileName: "stays.json",
        uniqueBy: ["title"],
    },
    activities: {
        model: Activity,
        fileName: "activities.json",
        uniqueBy: ["title"],
    },
    reviews: {
        model: Review,
        fileName: "reviews.json",
        uniqueBy: ["name", "stay"],
    },
};
