import Router from 'koa-router';
import jwt from '../middleware/jwt.js';
import logger from '../logs/log.js';

import ChartController from '../controllers/ChartController.js';

const router = new Router();
const jwtMiddleware = jwt({ secret: process.env.JWT_SECRET });

const chartController = new ChartController();

router.get('/api/v1/charts', jwtMiddleware, async (ctx, next) => {
    await chartController.index(ctx);
});

// fetch specific slice of a chart:
router.get('/api/v1/charts/:id/slice', jwtMiddleware, async (ctx, next) => {
    await chartController.fetchSlice(ctx);
});

// fetch last tailing slice of a chart:
router.get('/api/v1/charts/:id/tail', jwtMiddleware, async (ctx, next) => {
    await chartController.fetchTail(ctx);
});

// TODO: unsure if we'll want to have such controls from web:
//router.delete('/api/v1/notes/:id', jwtMiddleware, async (ctx, next) => {
    //await chartController.delete(ctx)
//})

export default router;
