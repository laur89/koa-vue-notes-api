const environment = process.env.NODE_ENV || 'development'

import config from '../../knexfile.js'
import knex from 'knex'

export default knex(config[environment])
