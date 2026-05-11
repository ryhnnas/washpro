const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const authRoutes = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const settingRoutes = require('./routes/settingRoutes');
const customerRoutes = require('./routes/customerRoutes');
const staffRoutes = require('./routes/staffRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const { startHealthCheck } = require('./services/whatsappService');
const whatsappService = require('./services/whatsappService');
const whatsappQueueService = require('./services/whatsappQueueService');

const app = express();
app.use(cors());
app.use(express.json());

// Gunakan Routes
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Test Route
app.get('/', (req, res) => res.send("WashPro API Active"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startHealthCheck();
  whatsappQueueService.initWorker(whatsappService);
});