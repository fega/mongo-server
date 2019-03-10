# Permission handling

You can protect your resources using the permissions field

```javascript
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

#### Advanced permission handling \(permissions and filters\)

you can define special permissions that can be reused across your logic.

```javascript
{
  resources:{
    secrets:{
      permissions:[['$custom','secrets:write']]
    }
  },
  permissions:{
    $custom:({resources, user, req, HttpError })=>{
      return truthyValue // pass the permission
      return falsyValue // oh oh, forbidden
      throw new HttpError.notFound() // you can throw errors using the http-errors package
    }
  }
}
```

But this approach will not work with `GET resources/`, for that reason the filters are implemented, filters are functions that returns mongodb queries.

```javascript
{
  resources:{
    secrets:{
      get: {permissions:[['$custom','secrets:write']]}
    }
  },
  permissions:{
    $custom:({resources, user, req })=>{
      return truthyValue // pass the permission
      return falsyValue // oh oh, forbidden
    }
  },
  filters:{
    $custom:({})=>{
      return {isPublic:true}
    }
  }
}
```

