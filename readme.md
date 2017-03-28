# Simple SQL Model

> A simple model wrapper around the `sql` library with helpful query functions.

This provides a bunch of convenience methods to create simple DB models quickly in a Rails-style query layout.


## Caveats

- This is considered somewhat in flux, don't use in production unless you're sure.
- This is stupid simple, it's just a dumb wrapper around the awesome `sql` module; you should check the source in `model.js` and the tests in `model.test.js` to see what's going on. I swear, it's *really simple*.
- This depends on new ES6 features like `Class` so use Node 4.8.1 or above or transpile.
  - Test require the use of `async`/`await` so please use Node 7.1.x or above when running tests.
- This isn't feature complete but it offers hooks to extend so you're not stuck with it's functionality. Pull requests welcome though!


## Installation

```bash
# npm
npm i -S simple-sql-model

# or yarn
yarn add simple-sql-model
```


## Usage

```js
const Connect = require('pg-promise')()
const Model = require('simple-sql-model')

// Connect to a Postgres DB. The connection can
// be to any SQL compatible DB that the `sql`
// module supports. The returned connection
// object must provide a Promise returning `query` 
// method to be compatible.
const connection = Connect({
  database: 'my-db',
  user: 'myuser',
})

class User extends Model {

  //---------------------------------------
  // Instance methods
  //---------------------------------------

  toString() {
    return this.name
  }


  //---------------------------------------
  // Class methods
  //---------------------------------------

  myCustomQuery() {
    this.table
  }
}

// Setup the database connection for the model.
User.configure({

  // The DB connection to use. Must provide a Promise
  // returning `query` function to be compatible.
  connection: connection,

  table: 'users',

  // Define columns in the table
  columns: [
    'id',
    'name',
    'isAdmin', // gets snake-cased to `is_admin`
  ],
})


//-------------------------------------------------------
// Create rows
//-------------------------------------------------------

const user = await User.create({ name: 'John' }) // save directly
const user2 = new User({ name: 'Bill' }) // initialize model instance
await user2.save() // save model instance to DB

//-------------------------------------------------------
// Update rows
//-------------------------------------------------------

await user.update({ name: 'Johnny' })
await User.update(user.id, { name: 'Johnny' })

//-------------------------------------------------------
// Find rows
//-------------------------------------------------------

await User.findOne(user.id)
// returns first match from query
await User.findOne({
  where: { name: { equals: 'John' } },
})
// returns all users
await User.findMany()
// returns array of the first 5 matches ordered by first name
await User.findMany({
  where: { name: { equals: 'John' } },
  order: { name: 'asc' },
  limit: 5,
})

//-------------------------------------------------------
// Count number of rows
//-------------------------------------------------------

await User.count()
await User.count({
  // includes j in name (case-insensitive)
  where: { name: { ilike: '%j%' } },
})

//-------------------------------------------------------
// Delete rows
//-------------------------------------------------------

await user.destroy()
await User.destroy(user.id)
await User.destroy({ where: { name: { equals: 'John' } } })
// Destroys everything so we want to make sure you 
// want this to happen!
await User.destroyAll({ yesImReallySure: true })


//-------------------------------------------------------
// Other helpful methods
//-------------------------------------------------------

User.toString() //=> 'User'
String(User) //=> 'User'
User.tableName // => 'users'
User.columns // => [ 'id', 'name', 'isAdmin' ]
```


## API

A lot of the built in class methods allow you to pass in an ID or a query object to find matching rows. 

The ID can be a `Number` or a `String` (eg `1` or `'1'`).

The query object looks like this:

```js
{
  where: {
    name: { equals: 'John' },
  },
  order: {
    name: 'desc',
  },
  limit: 5,
}
```

Checkout [this page](https://github.com/brianc/node-sql/blob/5ec7827cf637a4fe6b930fd4e8d27e6a8cb5289f/test/binary-clause-tests.js#L11) on the available `where` options. Also check out the test in this project for more examples.


### Class Methods


#### `Model.configure({ connection, columns, table })`

This must be called to connect your model to a SQL database.

- **Returns:**  Nothing
- **Arguments:**
  - `connection` - A connection to a SQL database that provides a Promise aware `.query()` method. This `query` method is what `simple-sql-model` will pass SQL strings to. It expects the results to be return directly (eg a `Object` representing a row or an `Array` representing a set of rows).
  - `columns` - An `Array` of table column name `String`s that map to your schema. They can be in snake_case or camelCase as we always convert to snake_case when converting queries to SQL.
  - `table` - The name of the table in your database to connect to (eg `'users'` or `'products'`).

#### `Model.create(fields)`

Creates a new row in the DB with the given fields and returns a new model instance.

- **Returns:**  A new `Model` instance.
- **Arguments:**
  - `fields` - The fields to create the new model from. Must match the schema.


#### `Model.findOne(idOrQuery)`

Finds one (or no) rows based on the given ID or query.

- **Returns:** A `Model` instance of the matched row or `null`.
- **Arguments:**
  - `idOrQuery` - An ID (`Number` or `String`) or query object to find the row in the table.


#### `Model.findMany(query)`

Finds one or more rows based on the given ID or query.

- **Returns:** A array of `Model` instances of the matched row or an empty array (`[]`).
- **Arguments:**  
  - `idOrQuery` - An ID (`Number` or `String`) or query object to find the row in the table.


#### `Model.update(idOrQuery, changes)`

Updates a row in the table with given changes based on an ID or query.

- **Returns:** An updated `Model` instance.
- **Arguments:**  
  - `idOrQuery` - An ID (`Number` or `String`) or query object to find the row in the table.
  - `changes` - An `Object` of the changes to the row. This can be one, some or all of the columns in the given table to change (eg partial or full updates are possible).


#### `Model.destroy(idOrQuery)`

Deletes a row from the table based on an ID or query.

- **Returns:** `undefined`
- **Arguments:**  
  - `idOrQuery` - An ID (`Number` or `String`) or query object to find the row to delete in the table.


#### `Model.count([query])`

Count up the number of matching records in the table. If an optional query is passed in, count the number of rows that match the query.

- **Returns:** Count (`Number`) of matching rows or `0`.
- **Arguments:**  
  - `query` (optional) - The query to use to limited the returned rows. If no query provided, it returns total amount of rows for this table.


### Class Properties


#### `Model.connection`

- **Returns:** the provided database connection object.


#### `Model.table`

- **Returns:** the provided table name.


#### `Model.columns`
- **Returns:** the provided `Array` of column names.


### Instance Methods


#### `model.update()`

- Same as `Model.update()` but no ID is required and returns the updated model instance.


#### `model.destroy()`

- Same as `Model.destroy()` but no ID is required.


## Development

```bash
# Setup the right node version using nvm
nvm install
nvm use

# Install deps
npm install

# Create a Postgres database named "simple-sql-model-test"

# Setup database table
# Update the DB username if necessary by passing DB_USERNAME=yourname
./setup.sh

npm test # or npm run watch-test
```


## Changelog

### v0.4.1

- Fix changelog numbers in readme

### v0.4.0

- Add `model.save()` method to create a row from an unsaved model instance.
- Update readme.

### v0.3.1

- Change Node dependency version
- Update readme

### v0.3.0

- Allow `model.update()` and `model.destroy()` instance methods
- Remove dependency on `async`/`await` support
- DRY things up a bit

### v0.2.0

- Fix camelCasing of queries to be consistent

### v0.1.0

Initial release. Implement `create`, `update`, `destroy`, `findOne`, `findMany`, and `count`.


## Credits

Licensed under an MIT license by [Dana Woodman](http://danawoodman.com).

Pull requests welcome!
