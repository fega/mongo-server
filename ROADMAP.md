### Advanced permission handling (permissions and filters)

you can define special permissions that can be reused across your logic.

```js
{
  resources:{
    secrets:{
      permissions:[['$custom','secrets:write']]
    }
  }
  permissions:{
    $custom:({resource, user, req })=>{
      return truthyValue // pass the permission
      return falsyValue // oh oh, forbidden
    }
  }
}
```

But this approach will not work with `GET resources/`, for that reason the filters are implemented, filters are functions that returns mongodb queries.

```js
{
  resources:{
    secrets:{
      get: {permissions:[['$filter','secrets:write']]}
    }
  }
  permissions:{
    $custom:({resource, user, req })=>{
      return truthyValue // pass the permission
      return falsyValue // oh oh, forbidden
    }
  }
}
```