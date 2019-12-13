# Db Seeding

You can seed your database using libraries like faker JS and Casual

```javascript
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

