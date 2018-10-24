# mongodb-sever

![Mongo-server](https://i.imgur.com/DJgIHcL.png)

Get a full REST API with __zero coding__ in __less than 30 seconds__ (seriously)
Hyper-Heavily inspired on [json-server](https://github.com/typicode/json-server)

## Getting started

Install mongo Server

```bash
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

For multiple fields, use the following format:

```curl
GET /posts?$sort=user&$sort=views&$order[]=desc$$order[]=asc
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

To do the opposite, add parent resources use `$fill` in the query.

```curl
GET /employees$fill=employees
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

### Config file

You can also set options in a `js` or `json` configuration file.

```js
module.exports= {
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
  staticRoot: '/',
  // personalized middleware, executed before REST api
  middleware: [myFunction],
  // default pagination limit
  pagination: 10,
}
```

### Strict Endpoints

You can restrict the endpoints for only what you provided using the restrict option in your config file:

```js
module.exports= {
  restrict: true,
  resources: ['users','dogs']
  // or
  resources: {
    users: true,
    dogs: true,
  }
}
```

### Defaults

With Defaults, you can assign default properties on resource creation / update,
if the function result includes  the keys `$owner`, `$timestamps` or `$changelog` `$version`, it will trigger special behaviors

```js
module.exports= {
  resources: {
    dogs: {
      post:{
        permissions:["user:permission"],
        default:(resource,user)=>({
          ...resource,
          $owner:true, // this will be saved as resourceName_id: id, so you can use it with the populate feature defined in the Relationships section
          $timestamps:true, // createdAt, updatedAt
          $version: true,
        })
      }
    },
  }
}
```

### Mailing

You can create a mailing service that sends you an email when a POST request hit the specified resource, using a nodemailer instance:

```js
module.exports= {
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
module.exports= {
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

### Login and Authentication

The majority of systems needs a way to identify and authenticate user, with Moser you can activate an auth system based on JWT just adding  one option in your config file

```js
module.exports= {
  resources: {
    users:{
      auth:{
        local:['email','password']
      }
    }
  },
  jwtSecret: 'secret', // by default is "secret", used to sign token
  bcryptRounds:1, //used to hash passwords by default is 1
}
```

using this you can call the endpoint `POST /auth/users/sign-up` to create an user and `POST /auth/users/log-in` to authenticate, after that, you will get a $token parameter in your log-in response, check the next section to know how to restrict access to your endpoints

### Permission handling

You can protect your resources using the permissions field

```js
module.exports= {
  resources: {
    users:{
      auth:{
        // the third parameter is the default user permssions (the  permissions will be saved in mongodb as "permissions")
        // mongo server uses internally https://github.com/MichielDeMey/express-jwt-permissions for the permission system
        local:['email','password',['dogs']]
      }
    }
    dogs:{
      // Only users with permission "dogs:read" will be able to access to this resource
      permissions:['dogs']
      // only users with permissions "dogs" AND "dogs:write" will be able to access to patch and put endpints
      patch:['dogs:write']
      put:['dogs:write']
    }
    cats:{
      // Only users with permission "cats:edit" or "admin" will be able to access to this resource
      permissions:[['admin'],['cats:edit']]
    }
    rabbits:{
      // specific permission per METHOD
      patch:{permissions:['rabbits:write']},
      put:{permissions:['rabbits:write']},
      delete:{permissions:['rabbits:remove'}],
      get:{permissions:['rabbits:read'],}
      getId:{permissions:['rabbits:read'],}
    }
  },
}
```

#### Advanced: especial permission and filters (NOT IMPLEMENTED YET)

coming soon...

### Input validation and Output Formating

In a production environment you should never trust in your incoming data,so here you can validate the incoming data easily using the Joi library (you need to install it):

```js
const postsIn = {
  // you can restrict the body (only in PUT PATCH and POST requests)
  body: {
    title: Joi.string().required(),
    content: Joi.string().required(),
  },
  // or the queryString (only in GET)
  get:{
    title:Joi.string(),
  }
};
module.exports= {
  resources: {
      posts:{ in: postsIn },
      // also you can process your outcoming data (to prevent unwanted leaks or add better formatting)
      out:(resource,user)=>{/*Return whatever you want */}
    },
  },
}
```

### route logic

Is very likely that you'll want to add custom logic for some endpoints. for those cases you can use the do fields, which is an enhanced version of the express middleware:

```js
module.exports= {
  resources:{
    dogs:{
      get:{
        // notice that could be an async function, and the use of the spread operator
        do: async ({req, res, next, db, user, resources})=>{
          // custom logic here
          return next() // ensure to throw an error or call next, like a normal express middleware
        }
      }
    }
  }
}
```

### Rate limit

coming soon...

### Caching

coming soon...

### Remote schema

coming soon...

### HTTPS

Coming soon...

### Add custom routes

Coming soon...

## License

MIT - [Fabian Enrique Gutierrez](https://github.com/fega)
