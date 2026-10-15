const express = require('express');
const router = express.Router();
const membersController = require('../controllers/members.controller');

router.get('/', membersController.getMembers);
router.get('/:id', membersController.getMemberById);
router.post('/', membersController.createMember);
router.post('/bulk', membersController.bulkCreateMembers);
router.put('/:id', membersController.updateMember);
router.delete('/:id', membersController.deleteMember);

module.exports = router;
