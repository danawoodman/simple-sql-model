const _ = require('lodash')
const sql = require('sql')

function camelizeObject(fields) {
  return _.reduce(
    fields,
    (result, value, key) => {
      result[_.camelCase(key)] = value
      return result
    },
    {}
  )
}

function decamelizeObject(fields) {
  return _.reduce(
    fields,
    (result, value, key) => {
      result[_.snakeCase(key)] = value
      return result
    },
    {}
  )
}

module.exports = class Model {
  constructor(fields) {
    const attrs = this.constructor._toModelFromDb(fields)
    this._updateFields(attrs)
  }

  //---------------------------------------------
  // Class methods
  //---------------------------------------------

  static configure(schema) {
    if (!schema) throw new Error('schema is required!')
    if (!schema.connection) throw new Error('connection is required!')
    if (!schema.columns) throw new Error('columns is required!')
    if (!schema.table) throw new Error('table is required!')

    this.columns = schema.columns
    this.connection = schema.connection
    this.tableName = schema.table
    this.references = schema.references
    this.table = sql.define({
      name: schema.table,
      columns: _.map(schema.columns, column => _.snakeCase(column)),
    })
  }

  static async create(fields) {
    const values = this._toDbFromModel(fields)
    const query = this.table.insert(values).returning()
    if (_.isFunction(this.beforeCreate)) {
      await this.beforeCreate(fields)
    }
    const model = await this._returnOne(query)
    if (_.isFunction(this.afterCreate)) {
      await this.afterCreate(model, fields)
    }
    return model
  }

  static async findOne(idOrQuery) {
    let query = this._constructQuery(idOrQuery).limit(1)
    return await this._returnOne(query)
  }

  static async findMany(search) {
    const query = this._constructQuery(search)
    return await this._returnMany(query)
  }

  static async update(idOrQuery, fields) {
    fields = this._onlyColumnValues(fields)

    this._debug('[update] Fields: ', fields)

    const changes = this._toDbFromModel(fields)

    this._debug('[update] Changes: ', changes)

    const start = this.table.update(changes)
    const query = this._constructQuery(idOrQuery, start)
    query.returning()
    if (_.isFunction(this.beforeUpdate)) {
      const before = await this.findOne(idOrQuery)
      await this.beforeUpdate(before, fields)
    }
    return this._returnOne(query).then(model => {
      if (_.isFunction(this.afterUpdate)) {
        this.afterUpdate(model, fields)
      }
      return model
    })
  }

  static async count(search = {}) {
    const startingQuery = this.table.select(this.table.count())
    const query = this._constructQuery(search, startingQuery)
    const result = await this.connection.query(query.toQuery())
    return Number(result[0][`${this.tableName}_count`])
  }

  static async destroy(idOrQuery) {
    const startingQuery = this.table.delete()
    const query = this._constructQuery(idOrQuery, startingQuery)
    if (_.isFunction(this.beforeDestroy)) {
      const before = await this.findOne(idOrQuery)
      await this.beforeDestroy(before)
    }
    const result = await this.connection.query(query.toQuery())
    if (_.isFunction(this.afterDestroy)) {
      await this.afterDestroy(before)
    }
    return result
  }

  static destroyAll({ yesImReallySure }) {
    if (yesImReallySure) {
      const query = this.table.delete()
      return this.connection.query(query.toQuery())
    }
  }

  static toString() {
    return this.name
  }

  //---------------------------------------------
  // Instance methods
  //---------------------------------------------

  /**
   * If the instance has an ID, we assume it is
   * persisted in the DB so we try to update it,
   * otherwise we create it.
   */
  async save(fields = {}) {
    const data = Object.assign({}, this, fields)

    if (this.id) {
      const existing = await this.constructor.update(this.id, data)
      this._updateFields(existing)
      return existing
    }

    const created = await this.constructor.create(data)
    this._updateFields(created)
    return created
  }

  destroy() {
    return this.constructor.destroy(this.id)
  }

  get className() {
    return this.constructor.name
  }

  toString() {
    return this.constructor.name
  }

  _updateFields(fields) {
    _.assign(this, fields)
  }

  //---------------------------------------------
  // Private class methods
  //---------------------------------------------

  static _constructQuery(search, startingQuery) {
    // Convert a string version of the ID to a number
    // in case the consumer forgot to do the conversion themselves.
    if (typeof search === 'string') {
      search = Number(search)
    }

    // Searching by ID
    if (typeof search === 'number') {
      search = {
        where: { id: { equals: search } },
      }
    }

    const query = startingQuery
      ? startingQuery
      : this.table.select(this.table.star())

    this._debug('[_constructQuery] Query: ', query)

    // Filter results
    // See here for all possible values:
    // https://github.com/brianc/node-sql/blob/5ec7827cf637a4fe6b930fd4e8d27e6a8cb5289f/test/binary-clause-tests.js#L11
    if (search && search.where) {
      _.map(search.where, (filters, field) => {
        _.map(filters, (value, filter) => {
          // TODO: Support "and/or" type queries
          // TODO: better error message if a key is not in the schema
          const snakedField = _.snakeCase(field)
          const column = this.table[snakedField]
          if (!column) {
            throw new Error(
              `No column "${snakedField}" found in schema. Make sure "${snakedField}" is defined in your list of columns in your configuration.`
            )
          }
          this._debug('[_constructQuery] Constructing where filter for: ', {
            filter,
            field: _.snakeCase(field),
            value,
          })
          query.where(column[filter](value))
        })
      })
    }

    // Sort results
    if (search && search.order) {
      _.map(search.order, (sort, field) => {
        query.order(this.table[_.snakeCase(field)][sort])
      })
    }

    // Limit amount of returned results.
    if (search && search.limit) {
      query.limit(search.limit)
    }

    this._debug('[_constructQuery] Query:', query.toQuery())

    return query
  }

  static _returnOne(query) {
    this._debug('[_returnOne] Query: ', query)

    return this.connection.query(query.toQuery()).then(async result => {
      if (!result || !result[0]) return null
      const model = new this(result[0])
      return await this._expandReferences(model)
    })
  }

  static _returnMany(query) {
    this._debug('[_returnMany] Query: ', query)

    return this.connection.query(query.toQuery()).then(async result => {
      return await Promise.all(
        result.map(async row => {
          const model = new this(row)
          return await this._expandReferences(model)
        })
      )
    })
  }

  // Expand any related reference models
  // as found in the refernces part of the configuration
  // object.
  static async _expandReferences(model) {
    if (this.references) {
      await Promise.all(
        _.map(this.references, async (val, key) => {
          model[key] = await val.model.findOne(model[val.key])
        })
      )
    }
    return model
  }

  static _onlyColumnValues(fields) {
    return _.pick(fields, this.columns)
  }

  static _toDbFromModel(model) {
    return decamelizeObject(model)
  }

  static _toModelFromDb(fields) {
    return camelizeObject(fields)
  }

  static _debug() {
    if (this.debug) console.log(...arguments)
  }
}
