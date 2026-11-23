const mongoose = require('mongoose')

async function ConnectDB() {
    try {

        await mongoose.connect(process.env.MONGO_URI)
        console.log('Database Connected'); 

    } catch (err) {
        console.error('Database connection failed:', err.message)
        throw err
    }
}

module.exports = ConnectDB