const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settings.controller');

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/categories', settingsController.addCategory);
router.delete('/categories/:name', settingsController.deleteCategory);

module.exports = router;
