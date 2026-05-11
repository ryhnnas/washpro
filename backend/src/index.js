const app = require('./app');
const { startHealthCheck } = require('./services/whatsappService');
const whatsappService = require('./services/whatsappService');
const whatsappQueueService = require('./services/whatsappQueueService');

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    startHealthCheck();
    whatsappQueueService.initWorker(whatsappService);
  });
}