require('dotenv').config();
const connectDb = require("./src/config/db");
const app = require('./src/app');
const PORT = process.env.PORT || 3000;
const generateInterviewReport = require("./src/services/ai.service");

 const startServer = async () => {
    try {
        await connectDb();
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Server startup aborted due to DB connection error.');
        process.exit(1);
    }
};

startServer();

