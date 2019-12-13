# Default values

With Defaults, you can assign default properties on resource creation / update, if the function result includes the keys `$owner`, `$timestamps` or `$changelog` `$version`, it will trigger special behaviors

```javascript
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

