const connectDB = require('./db');
const { startBot } = require('./bot');
const { app } = require('./webhook');

const PORT = process.env.PORT || 3000;

const start = async () => {
  await connectDB();
  startBot();
  
  app.listen(PORT, () => {
    console.log(`Webhook server running on port ${PORT}`);
  });
};

start();
