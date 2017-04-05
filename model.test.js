const Model = require('./model')
const sql = require('sql')

class Account extends Model {}

Account.configure({
  connection, // defined in test/helpers.js
  table: 'accounts',
  columns: [
    'id',
    'createdAt',
  ],
})

class User extends Model {}

//User.debug = true

User.configure({
  connection, // defined in test/helpers.js
  table: 'users',
  references: {
    account: {
      model: Account,
      key: 'accountId',
    },
  },
  columns: [
    'id',
    'accountId',
    'name',
    'isAdmin',
    'createdAt',
  ],
})

describe('server/lib/model', () => {
  let account

  beforeEach(async () => {
    await User.destroyAll({
      yesImReallySure: true,
    })
    account = await Account.create()
  })

  afterEach(async () => {
    await User.destroyAll({
      yesImReallySure: true,
    })
  })

  context('initialization', () => {

    it('should return inherited class name when stringifying', () => {
      expect(User.toString()).to.equal('User')
      expect(String(User)).to.equal('User')
    })

  })

  context('static methods', () => {

    context('.toJSON()', () => {

      it('should return all getters', async () => {
        const user = await User.create({
          accountId: account.id,
          name: 'Some User',
        })
        expect(user).to.deep.equal({
          id: user.id,
          isAdmin: false,
          accountId: account.id,
          name: 'Some User',
          account: {
            id: account.id,
            createdAt: account.createdAt,
          },
          createdAt: user.createdAt,
        })
      })

    })

    context('.create()', () => {

      it('should return an instance of the created model', async () => {
        const user = await User.create({
          accountId: account.id,
          name: 'Some User',
        })
        expect(user).to.be.instanceOf(User)
        expect(user.id).to.a.number
        expect(user.name).to.equal('Some User')
      })

    })

    context('.findOne()', () => {

      it('should find by ID if a number is passed in', async () => {
        const user = await User.create({
          accountId: account.id,
          name: 'Test1',
        })
        const found = await User.findOne(user.id)
        expect(found).to.deep.equal(user)
      })

      it('should find by query if a query is passed in', async () => {
        const user = await User.create({
          accountId: account.id,
          name: 'Some Dude',
        })
        const found = await User.findOne({
          where: { name: { equals: 'Some Dude' } },
        })
        expect(found).to.deep.equal(user)
      })

      it('should return null if nothing found', async () => {
        const found = await User.findOne({
          where: { name: { equals: 'Test1' } },
        })
        expect(found).to.be.null
      })

    })

    context('.findMany()', () => {

      it('should return an array of matched results', async () => {
        const u1 = await User.create({
          accountId: account.id,
          name: 'User 1',
        })
        const u2 = await User.create({
          accountId: account.id,
          name: 'User 2',
        })
        const result = await User.findMany()
        expect(result).to.include(u1)
        expect(result).to.include(u2)
      })

      it('should allow ordering', async () => {
        const u1 = await User.create({
          accountId: account.id,
          name: 'A',
        })
        const u2 = await User.create({
          accountId: account.id,
          name: 'Z',
        })
        const result = await User.findMany({
          order: {
            name: 'desc',
          },
        })
        expect(result[0]).to.deep.equal(u2)
        expect(result[1]).to.deep.equal(u1)
      })

      it('should allow filtering results', async () => {
        const u1 = await User.create({
          accountId: account.id,
          name: 'A',
        })
        const u2 = await User.create({
          accountId: account.id,
          name: 'Z',
        })
        const result = await User.findMany({
          where: {
            name: { equals: 'Z' },
          },
        })
        expect(result).to.have.length(1)
        expect(u2).to.deep.equal(result[0])
      })

      it('should allow multiple filters', async () => {
        const u1 = await User.create({
          accountId: account.id,
          name: 'James',
          isAdmin: true,
        })
        const u2 = await User.create({
          accountId: account.id,
          name: 'Jim',
          isAdmin: true,
        })
        const u3 = await User.create({
          accountId: account.id,
          name: 'Bob',
          isAdmin: false,
        })
        const result = await User.findMany({
          where: {
            name: { ilike: 'j%' },
            isAdmin: { equals: true },
          },
        })
        expect(result).to.have.length(2)
        expect(result).to.include(u1)
        expect(result).to.include(u2)
      })

      it('should allow chaining queries', async () => {
        const u1 = await User.create({
          accountId: account.id,
          name: 'John Zebra',
        })
        const u2 = await User.create({
          accountId: account.id,
          name: 'John Alligator',
        })
        const u3 = await User.create({
          accountId: account.id,
          name: 'Mary Loo Hoo',
        })
        const result = await User.findMany({
          where: { name: { like: 'John%' } }, // starts with...
          order: { name: 'asc' },
        })
        expect(result).to.have.length(2)
        expect(u2).to.deep.equal(result[0])
        expect(u1).to.deep.equal(result[1])
      })

      it('should allow limiting results', async () => {
        const u = await User.create({
          accountId: account.id,
          name: 'Tim',
        })
        await User.create({
          accountId: account.id,
          name: 'Jane',
        })
        await User.create({
          accountId: account.id,
          name: 'Elizabeth',
        })
        const result = await User.findMany({
          limit: 1,
        })
        expect(result).to.have.length(1)
        expect(result[0]).to.deep.equal(u)
      })

      xit('should allow custom queries', () => {
        //await User.findMany({
          //query(schema) {
            //return schema.select(schema.name).where(schema.id.in(Post.schema.select(Post.schema.userId)))
          //}
        //})
      })

      it('should return an empty array if nothing found', async () => {
        const result = await User.findMany()
        expect(result).to.have.length(0)
      })

    })

    context('.update()', () => {

      it('should update the given model row in the DB', async () => {
        const u1 = await User.create({
          accountId: account.id,
          name: 'Phil',
        })
        const u2 = await User.create({
          accountId: account.id,
          name: 'Rebecca',
        })
        const updated = await User.update(u1.id, { name: 'Philip' })
        expect(updated.name).to.equal('Philip')
        expect(u2.name).to.equal('Rebecca')
      })

    })

    context('.count()', () => {

      it('should count all rows if no query is passed', async () => {
        await User.create({
          accountId: account.id,
          name: 'Person 1',
        })
        await User.create({
          accountId: account.id,
          name: 'Person 2',
        })
        const count = await User.count()
        expect(count).to.equal(2)
      })

      it('should count all rows matching query', async () => {
        await User.create({
          accountId: account.id,
          name: 'Person 1',
        })
        await User.create({
          accountId: account.id,
          name: 'Person 2',
        })
        const count = await User.count({
          where: { name: { equals: 'Person 1' } },
        })
        expect(count).to.equal(1)
      })

      it('should return 0 if none found', async () => {
        const count = await User.count()
        expect(count).to.equal(0)
      })

    })

    context('.destroy()', () => {

      it('should destroy via ID', async () => {
        const u = await User.create({
          accountId: account.id,
          name: 'Some User',
        })
        expect(await User.count()).to.equal(1)
        await User.destroy(u.id)
        expect(await User.count()).to.equal(0)
      })

      it('should destroy via query', async () => {
        await User.create({
          accountId: account.id,
          name: 'User 1',
        })
        expect(await User.count()).to.equal(1)
        await User.destroy({ where: { name: { equals: 'User 1' } } })
        expect(await User.count()).to.equal(0)
      })

      it('should throw if no model found', async () => {
        try {
          await User.create({
            accountId: account.id,
            name: 'User 1',
          })
          expect(await User.count()).to.equal(1)
          await User.destroy({ where: { name: { equals: 'Doesnt match' } } })
          expect(await User.count()).to.equal(1)
        } catch (err) {
          console.error(err)
          throw new Error('Should not get here!')
        }
      })
    })

    context('lifecycle hooks', () => {

      context('create hooks', () => {

        it('should call before and after hooks when creating model', async () => {
          const beforeSpy = sinon.spy()
          const afterSpy = sinon.spy()
          const fields = {
            accountId: account.id,
            name: 'Create Hooks',
          }
          User.beforeCreate = (fields) => beforeSpy(fields)
          User.afterCreate = (model, fields) => afterSpy(model, fields)
          const user = await User.create(fields)
          expect(beforeSpy).to.be.calledWith(fields)
          expect(afterSpy).to.be.calledWith(user, fields)
        })

      })

      context('update hooks', () => {

        it('should call before and after hooks when updating model', async () => {
          const beforeSpy = sinon.spy()
          const afterSpy = sinon.spy()
          const fields = {
            accountId: account.id,
            name: 'Before Hooks',
          }
          const changes = { name: 'Update Hooks' }
          User.beforeUpdate = (model, changes) => beforeSpy(model, changes)
          User.afterUpdate = (model, changes) => afterSpy(model, changes)
          const user = await User.create(fields)
          const updated = await User.update(user.id, changes)
          expect(beforeSpy).to.be.calledWith(user, changes)
          expect(afterSpy).to.be.calledWith(updated, changes)
        })

      })

      context('destroy hooks', () => {

        it('should call before and after hooks when destroying model', async () => {
          const beforeSpy = sinon.spy()
          const afterSpy = sinon.spy()
          User.beforeDestroy = (model) => beforeSpy(model)
          User.afterDestroy = () => afterSpy()
          const user = await User.create({
            accountId: account.id,
            name: 'Destroy Hooks',
          })
          await User.destroy(user.id)
          expect(beforeSpy).to.be.calledWith(user)
          expect(afterSpy).to.be.called
        })

      })

    })

    context('._constructQuery()', () => {

      it('should convert field names to snake_case', () => {
        const query = User._constructQuery({
          where: { createdAt: { equals: 'value' } },
          order: { createdAt: 'desc' },
        })
        expect(query.toQuery()).to.deep.equal({
          text: 'SELECT "users".* FROM "users" WHERE ("users"."created_at" = $1) ORDER BY "users"."created_at" DESC',
          values: [ 'value' ],
        })
      })

      it('should throw a helpful error if field is not in schema', () => {
        try {
          User._constructQuery({
            where: { doesntExist: { equals: 'value' } },
          })
          throw new Error('should not get here')
        } catch (err) {
          expect(err.message).to.equal('No column "doesnt_exist" found in schema. Make sure "doesnt_exist" is defined in your list of columns in your configuration.')
        }
      })

      //xit('should convert string IDs to numbers', () => {

      //})

      //xit('should support searching by an ID', () => {

      //})

    })

    context('relations', () => {

      it('should expand relations if passed in', async () => {
        const user = await User.create({
          accountId: account.id,
          name: 'Some User',
        })
        expect(user.account).to.deep.equal(account)
      })

      it('should expand relations for arrays of results', async () => {
        await User.create({
          accountId: account.id,
          name: 'Some User',
        })
        await User.create({
          accountId: account.id,
          name: 'Another user',
        })
        const users = await User.findMany()
        expect(users[0].account).to.deep.equal(account)
        expect(users[1].account).to.deep.equal(account)
      })

    })

  })

  context('instance methods', () => {

    it('should stringify name of model by default', () => {
      expect(String(new User({ name: 'John' }))).to.equal('User')
    })

    context('.className', () => {

      it('should return name of class', () => {
        const user = new User({ name: 'Fred' })
        expect(user.className).to.equal('User')
      })

    })

    context('.save()', () => {

      it('should create and return model', async () => {
        expect(await User.findMany()).to.have.length(0)
        const user = new User({
          accountId: account.id,
          name: 'Fred',
        })
        await user.save()
        const users = await User.findMany()
        expect(users).to.have.length(1)
        expect(users[0]).to.deep.equal(user)
      })

      it('should update the user if they exist', async () => {
        const user = await User.create({
          accountId: account.id,
          name: 'A Person',
        })
        user.name = 'Another Person'
        await user.save()
        const fromDb = await User.findMany()
        expect(user.name).to.equal('Another Person')
        expect(fromDb[0].name).to.equal('Another Person')
      })

    })

    context('.destroy()', () => {

      it('should remove row from DB', async () => {
        const user = await User.create({
          accountId: account.id,
          name: 'Destroyed',
        })
        await user.destroy()
        const users = await User.findMany()
        expect(users).to.have.length(0)
      })

    })

  })

})
