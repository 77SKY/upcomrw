let app;
try {
  app = require('../backend/server');
} catch (err) {
  console.error('Failed to load server:', err);
}

module.exports = (req, res) => {
  if (!app) {
    return res.status(500).json({ error: 'Server failed to load' });
  }
  app(req, res);
};
