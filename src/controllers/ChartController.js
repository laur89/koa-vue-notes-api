import joi from 'joi'
//import d from 'date-fns'

import { User } from '../models/User'
import { Chart } from '../models/Chart'

class ChartController {
    // this guy lists all charts, paginated
    async index(ctx) {
        const query = ctx.query

        //Attach logged in user
        const user = new User(ctx.state.user)
        query.userId = user.id

        //Init a new chart object
        const chart = new Chart()

        //Let's check that the sort options were set. Sort can be empty
        if (!query.order || !query.page || !query.limit) {
            ctx.throw(400, 'INVALID_ROUTE_OPTIONS')
        }

        //Get paginated list of charts
        try {
            let result = await chart.all(query)
            ctx.body = result
        } catch (error) {
            console.log(error)
            ctx.throw(400, 'INVALID_DATA' + error)
        }
    }

    async show(ctx) {
        const params = ctx.params
        if (!params.id) ctx.throw(400, 'INVALID_DATA')

        //Initialize chart
        const chart = new Chart()

        try {
            //Find and show chart
            await chart.find(params.id)
            ctx.body = chart
        } catch (error) {
            console.log(error)
            ctx.throw(400, 'INVALID_DATA')
        }
    }

    //async delete(ctx) {
        //const params = ctx.params
        //if (!params.id) ctx.throw(400, 'INVALID_DATA')

        ////Find that note
        //const note = new Chart()
        //await note.find(params.id)
        //if (!note) ctx.throw(400, 'INVALID_DATA')

        ////Grab the user //If it's not their note - error out
        //const user = new User(ctx.state.user)
        //if (note.userId !== user.id) ctx.throw(400, 'INVALID_DATA')

        //try {
            //await note.destroy()
            //ctx.body = { message: 'SUCCESS' }
        //} catch (error) {
            //console.log(error)
            //ctx.throw(400, 'INVALID_DATA')
        //}
    //}
}

export default ChartController
