# mongodb-sever

Get a full REST API with __zero coding__ in __less than 30 seconds__ (seriously)
Hyper-Heavily inspired on [json-server](https://github.com/typicode/json-server)

## Getting started

Install mongo Server

```
npm install -g moser
```

Start Mongo Server

```bash
docker run -d -p 27017:27017 mongo # if you have docker but no mongodb 
moser --mongo mongodb://localhost:27017
```

Now if you go to [http://localhost:3000/posts/](http://localhost:3000/posts/), you'll get

```json
[]
```

Also when doing requests, it's good to know that:

- If you make POST, PUT, PATCH or DELETE requests, changes will be stored on mongodb.
- Your request body JSON should be object enclosed, just like the GET output. (for example `{"name": "Foobar"}`)
- Id values are not mutable. Any `id` value in the body of your PUT or PATCH request will be ignored. Only a value set in a POST request will be respected, but only if not already taken.
- id values are currently saved as plain text, this probably will change in the future

## Routes

You can basically use any routes as you want without need to define them, just be sure to make it plural to get the population system work as expected.

### Plural routes

```curl
GET    /posts
GET    /posts/1
POST   /posts
PUT    /posts/1
PATCH  /posts/1
DELETE /posts/1
```

### Filter

Use `.` to access deep properties

```curl
GET /posts?title=json-server&author=typicode
GET /posts?id=1&id=2
GET /comments?author.name=typicode
```

### Paginate

Use `$page` and optionally `$limit` to paginate returned data.

In the `Link` header you'll get `first`, `prev`, `next` and `last` links.

```curl
GET /posts?$page=7
GET /posts?$page=7&$limit=20
```

_10 items are returned by default_

### Sort

Add `$sort` and `$order` (ascending order by default)

```curl
GET /posts?$sort=views&$order=asc
GET /posts/1/comments?$sort=votes&$order=asc
```

For multiple fields, use the following format (NOT_IMPLEMENTED YET):

```curl
GET /posts?$sort=user,views&$order=desc,asc
```

### Advanced queries

Use `$query` to send a JSON with any mongodb query

```curl
GET /posts?$query={"name":"Puky"}
```

### Full-text search

Coming soon...

### Relationships

To include children resources, add `$populate`

```curl
GET /companies$populate=employees
```

``` js
  // create two companies
  await db.collection('companies').insertOne({ _id: 1, name: 'corp' });
  await db.collection('companies').insertOne({ _id: 2, name: 'inc' });
  // this employee works in company 1, notice the using of singular word for companies
  await db.collection('employees').insertOne({ _id: 1, name: 'Foobio', company_id: 1 });
  // this employee works for both!, notice the "s" on company_ids!
  await db.collection('employees').insertOne({ _id: 2, name: 'Barfy', company_ids: [1, 2] });
  
  const r = await request(server).get('/companies?$populate=employees').expect(200);

  // employees are populated"
  a.equal(r.body[0].employees.length, 2);
  a.equal(r.body[1].employees.length, 1);
```

## Extras

### CLI usage

```bash
Usage: mongodb-server [options]

  Options:                   Description:                Default:

    -V, --version            output the version number
    -c, --config <filePath>  Set a config file           undefined
    -p --port <number>       Server port                 3000
    -m --mongo <uri>         mongodb URI                 mongodb://localhost:27017
    -d --db <string>         database name               mongo-server
    -h, --help               output usage information
```

## Config file

You can also set options in a `js` or `json` configuration file.

```js
{
  // Port, default 3000
  port: 3000,
  // REST api root, default "/"
  root: "/",
  // mongodb url default: "mongodb://localhost:27088"
  mongo: 'mongodb://localhost:27088',
  // database name
  db:'dbName',
  // enable cors using the cors module https://www.npmjs.com/package/cors
  cors: {origin:true},
  // enable gzip compression using the compression module https://www.npmjs.com/package/compression
  compress: {},
  // enable helmet module https://www.npmjs.com/package/helmet
  helmet: {},
  // static file server, by default is "public" in the execution dir
  static: 'public',
  // root path for static file serving, by default "/"
  staticRoot: '/'
  // personalized middleware, executed before REST api
  middleware: [myFunction]
}
```

### Strict Endpoints

You can restrict the endpoints for only what you provided using the restrict option in your config file:

```js
{
  restrict: true,
  resources: ['users','dogs']
  // or
  resources: {
    users: true,
    dogs: true,
  }
}
```

### Mailing

You can create a mailing service that sends you an email when a Post request hit the specified resource, using a nodemailer instance:

```js
{
    resources: {
      dogs: {
        // this option will do the trick
        email: {
          to: ['fega.hg@gmail.com'],
          title: 'An optional title'
        }
      },
    },
    nodemailer: {
      // place here your nodemailer configuration
      service: 'MailDev',
    },
  }
```

This option could be helpful for landing pages.

### Seeds

You can seed your database using libraries like faker JS and Casual

```js
const casual= require('casual')
{
    resources: {
      dogs: {
        seed:()=>({
          name: casual.name
          color: casual.color_name
        })
      },
      mouses:{
        seed: ()=>[{name:"Minnie"},{name:"Mickey"}] // another way to seed dbs
      }
    },
    seed:true, // this can also be a object being every key a resource seeder
    // if you set this this to true, you will delete the db and force seeding! be careful
    forceSeed:false,
  }
```

### Strict Schemas

coming soon...

### Remote schema

coming soon...

### Generate random data

Coming soon...

### HTTPS

Coming soon...

### Add custom routes

Coming soon...

### automatic auth

Coming soon...

## License

MIT - [Fega](https://github.com/fega)
