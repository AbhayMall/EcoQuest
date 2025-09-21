const { Router } = require('express');
const authRoutes = require('./auth');
const courseRoutes = require('./courses');
const quizRoutes = require('./quizzes');
const adminRoutes = require('./admin');
const notificationRoutes = require('./notifications');
const communityRoutes = require('./community');
const assignmentRoutes = require('./assignments');
const progressRoutes = require('./progress');
const competitionRoutes = require('./competitions');
const gameRoutes = require('./games');
const teacherRoutes = require('./teachers');

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'EcoLearn API v1' });
});

router.use('/auth', authRoutes);
router.use('/courses', courseRoutes);
router.use('/quizzes', quizRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/community', communityRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/progress', progressRoutes);
router.use('/competitions', competitionRoutes);
router.use('/games', gameRoutes);
router.use('/teachers', teacherRoutes);
router.use('/files', teacherRoutes); // getFile handler uses /files/:fileId


// ... other imports
const fileRoutes = require('./files');



// ... other router.use() calls
router.use('/teachers', teacherRoutes);
router.use('/files', fileRoutes); // Add this line

module.exports = router;


