import db from '../db/db.js'
import rand from 'randexp'

// here the actual db calls are performed
class Chart {
    constructor(data) {
        if (!data) return
        this._assign(data)
    }

    _assign(data) {
        this.id = data.id
        this.userId = data.userId
        this.title = data.title
        this.chartId = data.chartId
    }

    async all(request) {
        try {
            return await db('charts')
                .select('*')
                .where({ userId: request.userId })
                .where(
                    'title',
                    'like',
                    '%' + (request.sort ? request.sort : '') + '%'
                )
                .orderBy('createdAt', request.order)
                .offset(+request.page * +request.limit)
                .limit(+request.limit)
        } catch (error) {
            console.log(error)
            throw new Error('ERROR')
        }
    }

    async find(id) {
        try {
            let result = await findById(id)
            if (!result) return {}
            this._assign(result)
        } catch (error) {
            console.log(error)
            throw new Error('ERROR')
        }
    }

    async store() {
        try {
            return await db('charts').insert(this)
        } catch (error) {
            console.log(error)
            throw new Error('ERROR')
        }
    }
    //async destroy(request) {
        //try {
            //return await db('charts')
                //.delete()
                //.where({ id: this.id })
        //} catch (error) {
            //console.log(error)
            //throw new Error('ERROR')
        //}
    //}
}

async function findById(id) {
    try {
        let [noteData] = await db('charts')
            .select('id', 'userId', 'title', 'chartId')
            .where({ id: id })
        return noteData
    } catch (error) {
        console.log(error)
        throw new Error('ERROR')
    }
}

export { Chart, findById }
