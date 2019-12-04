import Router from 'koa-router'
import jwt from '../middleware/jwt'
import logger from '../logs/log'

import ChartController from '../controllers/ChartController'

const router = new Router()
const jwtMiddleware = jwt({ secret: process.env.JWT_SECRET })

const chartController = new ChartController()

router.get('/api/v1/charts', jwtMiddleware, async (ctx, next) => {
    await chartController.index(ctx)
})

router.get('/api/v1/notes/:id', jwtMiddleware, async (ctx, next) => {
    await chartController.show(ctx)
})

// TODO: unsure if we'll want to have such controls from web:
//router.delete('/api/v1/notes/:id', jwtMiddleware, async (ctx, next) => {
    //await chartController.delete(ctx)
//})

export default router
