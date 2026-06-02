const mongoose = require("mongoose")

async function connectDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI) 
        console.log("Forbundet til MongoDB!")
    } catch (error) {
        console.error("Kunne ikke oprette forbindelse til MongoDB..", error.message)
    }
}

module.exports = connectDatabase