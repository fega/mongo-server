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

### Filter by equality

You can filter by any by using `field=value`, Use `.` to access deep properties

```http
c
GET /posts?id=1&id=2
GET /comments?author.name=fega
```

You can use `$select` to return only the fields that you need.

### Advanced filters

You can use different modifiers in order to perform special queries:

```bash
# Format 
GET /resources?field:modifier=value
# or
GET /resources?field:modifier:coerce=value # where coerce can be "id", "date", or "number"


# bool: Boolean Coercion
GET /comments?seen:bool=true

# date: date Coercion
GET /comments?createdAt:date=2019-08-15T20:01:17.065Z
GET /comments?createdAt:date=1565899340489

# id: Object Id Coercion
GET /comments?variableStoredAsObjectId:id=5d392ddb3aac2900173a876a

# number: Number Coercion
GET /comments?points:number=10

# ne: Not Equal
GET /comments?name:ne=Vektor

# lt: Lower than
GET /comments?points:lt=10

# gt: Greater than
GET /comments?points:gt=10

# lte: Lower than or equal
GET /comments?points:lte=10

# gte: Greater than or equal
GET /comments?points:gte=10

# i:
GET /comments?fruits:in=apple
GET /comments?fruits:in[]=apple&fruits:in[]=banana

# nin:
GET /comments?fruits:nin=apple
GET /comments?fruits:nin[]=apple&fruits:nin[]=banana

# size 
GET /items?fruits:size=10
```

### Pick fields to return

```http
GET /posts?$select[]=author&$select[]=_id
GET /posts?$select=name
```

```
GET /posts?$page=7
```

### Paginate

Use `$page` and optionally `$limit` to paginate returned data. keep in mind that the first page is 0 \`$page=0\`

```http
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

### Regular Expressions \(Regex\)

Use  `$regex`  to send a regex Query

```text
GET /posts?$regex=["FieldName","Regex","flags"]
# the regex value should be a valid Js Array
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

Sometimes you want to pass some data that are neither queries or filters, to be used in the route logic, permissions or filters. you can use them with query flags: 

```http
GET /employees?$$flag=someData&$$anotherFlag=moreData
```

### Geo Filters \(Coming Soon\)

```bash
# intersect
GET /countries?location:geo:ins:polygon=[[]]
GET /countries?location:geo:ins:multipolygon

# within
GET /countries?location:geo:win:polygon=[[]]
GET /countries?location:geo:win:multipolygon=[[]]

# Near Point
GET /countries?location:geo:near=[LONG,LAT,MIN,MAX]
```

