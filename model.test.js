const Model = require('./model')
const sql = require('sql')

class User extends Model {}

//User.debug = true

User.configure({
  connection, // defined in test/helpers.js
  table: 'users',
  columns: [
    'id',
    'name',
    'createdAt',
  ]
})

describe('server/lib/model', () => {

  beforeEach(async () => {
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

    context('.create()', () => {

      it('should return an instance of the created model', async () => {
        const user = await User.create({ name: 'Some User' })
        expect(user).to.be.instanceOf(User)
        expect(user.id).to.a.number
        expect(user.name).to.equal('Some User')
      })

    })

    context('.findOne()', () => {

      it('should find by ID if a number is passed in', async () => {
        const user = await User.create({ name: 'Test1' })
        const found = await User.findOne(user.id)
        expect(found).to.deep.equal(user)
      })

      it('should find by query if a query is passed in', async () => {
        const user = await User.create({ name: 'Test1' })
        const found = await User.findOne({
          where: { name: { equals: 'Test1' } },
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
        const u1 = await User.create({ name: 'User 1' })
        const u2 = await User.create({ name: 'User 2' })
        const result = await User.findMany()
        expect([ u1, u2 ]).to.deep.equal(result)
      })

      it('should allow ordering', async () => {
        const u1 = await User.create({ name: 'A' })
        const u2 = await User.create({ name: 'Z' })
        const result = await User.findMany({
          order: {
            name: 'desc',
          },
        })
        expect(result[0]).to.deep.equal(u2)
        expect(result[1]).to.deep.equal(u1)
      })

      it('should allow filtering results', async () => {
        const u1 = await User.create({ name: 'A' })
        const u2 = await User.create({ name: 'Z' })
        const result = await User.findMany({
          where: {
            name: { equals: 'Z' },
          },
        })
        expect(result).to.have.length(1)
        expect(u2).to.deep.equal(result[0])
      })

      it('should allow chaining queries', async () => {
        const u1 = await User.create({ name: 'John Zebra' })
        const u2 = await User.create({ name: 'John Alligator' })
        const u3 = await User.create({ name: 'Mary Loo Hoo' })
        const result = await User.findMany({
          where: { name: { like: 'John%' } }, // starts with...
          order: { name: 'asc' },
        })
        expect(result).to.have.length(2)
        expect(u2).to.deep.equal(result[0])
        expect(u1).to.deep.equal(result[1])
      })

      it('should allow limiting results', async () => {
        const u = await User.create({ name: 'Tim' })
        await User.create({ name: 'Jane' })
        await User.create({ name: 'Elizabeth' })
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
        const u1 = await User.create({ name: 'Phil' })
        const u2 = await User.create({ name: 'Rebecca' })
        const updated = await User.update(u1.id, { name: 'Philip' })
        expect(updated.name).to.equal('Philip')
        expect(u2.name).to.equal('Rebecca')
      })

    })

    context('.count()', () => {

      it('should count all rows if no query is passed', async () => {
        await User.create({ name: 'Person 1' })
        await User.create({ name: 'Person 2' })
        const count = await User.count()
        expect(count).to.equal(2)
      })

      it('should count all rows matching query', async () => {
        await User.create({ name: 'Person 1' })
        await User.create({ name: 'Person 2' })
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
        const u = await User.create({ name: 'Some User' })
        expect(await User.count()).to.equal(1)
        await User.destroy(u.id)
        expect(await User.count()).to.equal(0)
      })

      it('should destroy via query', async () => {
        await User.create({ name: 'User 1' })
        expect(await User.count()).to.equal(1)
        await User.destroy({ where: { name: { equals: 'User 1' } } })
        expect(await User.count()).to.equal(0)
      })

      it('should throw if no model found', async () => {
        try {
          await User.create({ name: 'User 1' })
          expect(await User.count()).to.equal(1)
          await User.destroy({ where: { name: { equals: 'Doesnt match' } } })
          expect(await User.count()).to.equal(1)
        } catch (err) {
          console.error(err)
          throw new Error('Should not get here!')
        }
      })
    })

    //context('._constructQuery()', () => {

      //xit('should convert string IDs to numbers', () => {

      //})

      //xit('should support searching by an ID', () => {

      //})

    //})

  })

  context('instance methods', () => {

    it('should stringify name of model by default', () => {
      expect(String(new User())).to.equal('User')
    })
  })

})
