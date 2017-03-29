const _ = require('lodash')
const sql = require('sql')

function camelizeObject(fields) {
  return _.reduce(fields, (result, value, key) => {
    result[_.camelCase(key)] = value
    return result
  }, {})
}

function decamelizeObject(fields) {
  return _.reduce(fields, (result, value, key) => {
    result[_.snakeCase(key)] = value
    return result
  }, {})
}

module.exports = class Model {


  constructor(fields) {
    const attrs = this.constructor._toModelFromDb(fields)
    Object.assign(this, attrs)
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
    this.table = sql.define({
      name: schema.table,
      columns: _.map(schema.columns, (column) => _.snakeCase(column)),
    })
  }

  static create(fields) {
    const values = this._toDbFromModel(fields)
    const query = this.table.insert(values).returning()
    if (_.isFunction(this.beforeCreate)) {
      this.beforeCreate(fields)
    }
    return this._returnOne(query)
      .then((model) => {
        if (_.isFunction(this.afterCreate)) {
          this.afterCreate(model, fields)
        }
        return model
      })
  }

  static findOne(idOrQuery) {
    let query = this._constructQuery(idOrQuery).limit(1)
    return this._returnOne(query)
  }

  static findMany(search) {
    const query = this._constructQuery(search)
    return this._returnMany(query)
  }

  static update(idOrQuery, fields) {
    const changes = this._toDbFromModel(fields)
    const start = this.table.update(changes)
    const query = this._constructQuery(idOrQuery, start)
    query.returning()
    if (_.isFunction(this.beforeUpdate)) {
      this.findOne(idOrQuery)
        .then((model) => this.beforeUpdate(model, fields))
    }
    return this._returnOne(query)
      .then((model) => {
        if (_.isFunction(this.afterUpdate)) {
          this.afterUpdate(model, fields)
        }
        return model
      })
  }

  static count(search = {}) {
    const startingQuery = this.table.select(this.table.count())
    const query = this._constructQuery(search, startingQuery)
    return this.connection
      .query(query.toQuery())
      .then((result)=> Number(result[0].users_count))
  }

  static destroy(idOrQuery) {
    const startingQuery = this.table.delete()
    const query = this._constructQuery(idOrQuery, startingQuery)
    if (_.isFunction(this.beforeDestroy)) {
      this.findOne(idOrQuery)
        .then((model) => this.beforeDestroy(model))
    }
    return this.connection.query(query.toQuery())
      .then(() => {
        if (_.isFunction(this.afterDestroy)) {
          this.afterDestroy()
        }
      })
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

  save() {
    return this.constructor
      .create(this)
      .then((row) => {
        Object.assign(this, row)
        return row
      })
  }

  update(fields) {
    return this.constructor
      .update(this.id, fields)
      .then((model) => {
        Object.assign(this, model)
        return model
      })
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

    const query = startingQuery ? startingQuery : this.table.select(this.table.star())

    // Filter results
    // See here for all possible values:
    // https://github.com/brianc/node-sql/blob/5ec7827cf637a4fe6b930fd4e8d27e6a8cb5289f/test/binary-clause-tests.js#L11
    if (search && search.where) {
      _.map(search.where, (filters, field) => {
        _.map(filters, (value, filter) => {
          // TODO: Support "and/or" type queries
          query.where(this.table[_.snakeCase(field)][filter](value))
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
    return this.connection
      .query(query.toQuery())
      .then((result) => result && result[0] ? new this(result[0]) : null)
  }

  static _returnMany(query) {
    return this.connection
      .query(query.toQuery())
      .then((result) => result.map((row) => new this(row)))
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
