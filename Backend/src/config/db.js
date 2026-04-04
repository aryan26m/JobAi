const dns = require('dns');
const mongoose = require('mongoose');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const connectDb = async () => {
      try{

              await mongoose.connect(process.env.MONGO_URI);
              console.log('Connected to MongoDB');
        }catch(error){
              console.error('Error connecting to MongoDB:', error);
              throw error; // Rethrow the error to be handled by the caller
        }
};

module.exports = connectDb;