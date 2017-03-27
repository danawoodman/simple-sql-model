const Connect = require('pg-promise')()
const sql = require('sql')

sql.setDialect('postgres')

global.expect = require('chai').expect
global.sinon = require('sinon')

if (!global.connection) {
  global.connection = Connect({
    database: 'simple-sql-model-test',
    user: 'dana',
  })
}
