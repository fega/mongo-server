# Route logic

Is very likely that you'll want to add custom logic for some endpoints. for those cases you can use the do fields, which is an enhanced version of the express middleware:

```javascript
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

