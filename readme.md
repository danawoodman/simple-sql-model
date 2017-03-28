# Simple SQL Model

> A simple model wrapper around the `sql` library with helpful query functions.

This provides a bunch of convenience methods to create simple DB models quickly in a Rails-style query layout.


## Caveats

- This is considered somewhat in flux, don't use in production unless you're sure.
- This is stupid simple, it's just a dumb wrapper around the awesome `sql` model; you should check the source in `model.js` and the tests in `model.test.js` to see what's going on. I swear, it's *really simple*.
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
const Model = require('simple-sql-model')

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

User.configure({
  table: 'users',

  // Define 
  columns: [
    'id',
    'name',
    'email',
    'isAdmin', // gets snake-cased to `is_admin`
  ]
})

// create
await User.create({
  name: 'John Smith',
  email: 'john@google.com',
  isAdmin: false,
})

// findOne
await User.findOne(1)
await User.findOne({ where: { name: { equals: 'John' } } })

// findMany
await User.findMany({ where: { name: { equals: 'John' } } })

// Create a new model instance
const user = new User({ name: 'John' })
console.log(user.toString()) //=> 'John'
console.log(String(user)) //=> 'John'
```


## API

A lot of the built in class methods allow you to pass in an ID or a query object to find matching rows. 

The ID can be in `Number` or `String`.

The query object looks like:

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

Checkout [this page](https://github.com/brianc/node-sql/blob/5ec7827cf637a4fe6b930fd4e8d27e6a8cb5289f/test/binary-clause-tests.js#L11) on the available `where` options as well as check out the test for more examples.


### `Model.create(fields)`

Creates a new row in the DB with the given fields and returns a new model instance.

#### Returns

A new `Model` instance.

#### Arguments

- `fields` - The fields to create the new model from. Must match the schema.


### `Model.findOne(idOrQuery)`

Finds one (or no) rows based on the given ID or query.

#### Returns

A `Model` instance of the matched row or `null`.

#### Arguments

- `idOrQuery` - An ID (`Number` or `String`) or query object to find the row in the table.


### `Model.findMany(query)`

Finds one or more rows based on the given ID or query.

#### Returns

A array of `Model` instances of the matched row or an empty array (`[]`).

#### Arguments

- `idOrQuery` - An ID (`Number` or `String`) or query object to find the row in the table.


### `Model.update(idOrQuery, changes)`

Updates a row in the table with given changes based on an ID or query.

#### Returns

An updated `Model` instance.

#### Arguments

- `idOrQuery` - An ID (`Number` or `String`) or query object to find the row in the table.
- `changes` - An `Object` of the changes to the row. This can be one, some or all of the columns in the given table to change (eg partial or full updates are possible).


### `Model.destroy(idOrQuery)`

Deletes a row from the table based on an ID or query.

#### Returns

`undefined`

#### Arguments

- `idOrQuery` - An ID (`Number` or `String`) or query object to find the row to delete in the table.


### `Model.count([query])`

Count up the number of matching records in the table. If an optional query is passed in, count the number of rows that match the query.

#### Returns

Count (`Number`) of matching rows or `0`.

#### Arguments

- `query` (optional) - The query to use to limited the returned rows. If no query provided, it returns total amount of rows for this table.


### `Model.connection`

Returns the provided database connection object.


### `Model.table`

Returns the provided table name.


### `Model.schema`

Returns the provided DB schema.


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

### v0.2.1

- Change Node dependency version
- Update readme

### v0.2.0

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
