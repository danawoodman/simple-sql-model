const Connect = require('pg-promise')()
const chai = require('chai')
const sql = require('sql')

sql.setDialect('postgres')

chai.use(require('sinon-chai'))

global.expect = chai.expect
global.sinon = require('sinon')

if (!global.connection) {
  global.connection = Connect({
    database: 'simple-sql-model-test',
    user: 'dana',
  })
}
