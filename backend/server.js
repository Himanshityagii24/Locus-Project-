const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const connectDB = require('./config/db');
const autoCancelJob = require('./jobs/autoCancelJob');

// Routes
const userRoutes = require('./routes/userRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');

app.get('/', (req, res) => {
  res.json({ message: 'Canteen API', status: 'running' });
});

app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ status: 'ok', database: dbStatus });
});

app.use('/api/users', userRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);

const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);

connectDB()
  .then(() => {
    autoCancelJob.start();
    app.listen(PORT, () => console.log(`Server on port ${PORT}`));
  })
  .catch(err => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });

process.on('SIGINT', async () => {
  autoCancelJob.stop();
  await mongoose.connection.close();
  process.exit(0);
});