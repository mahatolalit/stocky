const { Router } = require('express');
const reward = require('../controllers/rewardController');
const query = require('../controllers/queryController');

const router = Router();

router.post('/reward', reward.postReward);
router.get('/today-stocks/:userId', query.todayStocks);
router.get('/historical-inr/:userId', query.historicalInr);
router.get('/stats/:userId', query.stats);
router.get('/portfolio/:userId', query.portfolio);

module.exports = router;
