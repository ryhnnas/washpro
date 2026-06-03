const whatsappService = require('../services/whatsappService');

const getStatus = async (req, res) => {
  try {
    const status = await whatsappService.checkConnectionStatus(req.user.businessId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const connectQR = async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Hanya OWNER yang bisa menghubungkan WhatsApp' });
  }
  try {
    const result = await whatsappService.loginWithQR(req.user.businessId);
    if (!result.ok) return res.status(500).json({ error: result.error });
    res.json({ message: 'Silakan scan QR Code ini', qr_code: result.qr });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const connectPairing = async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Hanya OWNER yang bisa menghubungkan WhatsApp' });
  }
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ message: 'Nomor HP wajib diisi' });

    const result = await whatsappService.loginWithCode(req.user.businessId, phoneNumber);
    if (!result.ok) return res.status(500).json({ error: result.error });
    res.json({ message: 'Masukkan kode ini di WhatsApp Anda', pairing_code: result.code });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const disconnect = async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Hanya OWNER yang bisa memutuskan WhatsApp' });
  }
  try {
    const result = await whatsappService.logoutDevice(req.user.businessId);
    if (!result.ok) return res.status(500).json({ error: result.error });
    res.json({ message: 'WhatsApp berhasil diputuskan' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const sendTestMessage = async (req, res) => {
  if (req.user.role !== 'OWNER') {
    return res.status(403).json({ message: 'Hanya OWNER' });
  }
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: 'Nomor HP wajib diisi' });

  try {
    const result = await whatsappService.sendMessage({
      businessId: req.user.businessId,
      phone,
      message: `Pesan uji coba integrasi WhatsApp berhasil.\n\n_Pesan otomatis dari WashPro._`
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getStatus,
  connectQR,
  connectPairing,
  disconnect,
  sendTestMessage,
};
