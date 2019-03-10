# Routing and Queries

## Routes

You can basically use any routes as you want without need to define them, just be sure to make it plural to get the population system work as expected.

### Plural routes

```http
GET    /posts
GET    /posts/1
POST   /posts
PUT    /posts/1
PATCH  /posts/1
DELETE /posts/1
```

### Filter

You can filter by any field=value Use `.` to access deep properties

```http
GET /posts?title=moser&author=fega
GET /posts?id=1&id=2
GET /comments?author.name=fega
```

### Filter Fields

You can use `$select` to return only the fields that you need.

```http
GET /posts?$select[]=author&$select[]=_id
GET /posts?$select=name
```

### Paginate

Use `$page` and optionally `$limit` to paginate returned data.

In the `Link` header you'll get `first`, `prev`, `next` and `last` links.

```http
GET /posts?$page=7
GET /posts?$page=7&$limit=20
```

_10 items are returned by default_

### Sort

Add `$sort` and `$order` \(ascending order by default\)

```http
GET /posts?$sort=views&$order=asc
GET /posts/1/comments?$sort=votes&$order=asc
```

For multiple fields, use the following format:

```http
GET /posts?$sort=user&$sort=views&$order[]=desc$$order[]=asc
```

### Count

Use $count to get an answer with the total document count

```http
GET /posts?$count=1
```

response:

```javascript
{
    "count":10
}
```

### 

### Advanced queries

Use `$query` to send a JSON with any mongodb query

```http
GET /posts?$query={"name":"Puky"}
```

### Full-text search

Coming soon...

### Relationships

To include children resources, add `$populate`

```http
GET /companies$populate=employees
```

```javascript
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

```http
GET /employees?$fill=companies
```

### Flags

Sometimes you want to pass some data that are neither queries or filters, to be user in the route logic, permissions or filters. you can use them with query flags: 

```http
GET /employees?$$flag=someData&$$anotherFlag=moreData
```

