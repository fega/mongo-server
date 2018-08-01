# mongodb-sever

Get a full REST API with __zero coding__ in __less than 30 seconds__ (seriously)
Hyper-Heavily inspired on [json-server](https://github.com/typicode/json-server)

## Getting started

Install   mongo Server 

```
npm install -g mongoserver
```

Start Mongo Server

```bash
docker run -d -p 27017:27017 mongo # if you have docker but no mongodb 
mongoserver --mongo mongodb://localhost:27017
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

```
GET    /posts
GET    /posts/1
POST   /posts
PUT    /posts/1
PATCH  /posts/1
DELETE /posts/1
```


### Filter

Use `.` to access deep properties

```
GET /posts?title=json-server&author=typicode
GET /posts?id=1&id=2
GET /comments?author.name=typicode
```

### Paginate

Use `$page` and optionally `$limit` to paginate returned data.

In the `Link` header you'll get `first`, `prev`, `next` and `last` links.


```
GET /posts?$page=7
GET /posts?$page=7&$limit=20
```

_10 items are returned by default_

### Sort

Add `$sort` and `$order` (ascending order by default)

```
GET /posts?$sort=views&$order=asc
GET /posts/1/comments?$sort=votes&$order=asc
```

For multiple fields, use the following format (NOT_IMPLEMENTED YET):

```
GET /posts?$sort=user,views&$order=desc,asc
```

### Advanced queries

Use `$query` to send a JSON with any mongodb query

```
GET /posts?$query={"name":"Puky"}
```

### Full-text search

Coming soon...

### Relationships

To include children resources, add `$populate`

```
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

### Alternative port

You can start Mongo Server on other ports with the `--port` flag:

```bash
$ json-server --watch db.json --port 3004
```

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

You can also set options in a `js` or `json` configuration file.

```json
{
  "port": 3000
}
``` 


### Static file server

Coming soon...


### Access from anywhere

Coming soon...

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

### Add middlewares

Coming soon...

### automatic auth

Coming soon...

### restrict routes and features

Coming soon...

## License

MIT - [Fega](https://github.com/fega)
