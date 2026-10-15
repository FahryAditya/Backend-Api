const express = require('express');
const router = express.Router();
const membersController = require('../controllers/members.controller');

router.get('/', membersController.getMembers);
router.post('/', membersController.createMember);
router.put('/:id', membersController.updateMember);
router.delete('/:id', membersController.deleteMember);

module.exports = router;
