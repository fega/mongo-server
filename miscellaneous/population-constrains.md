# Population Constrains

You can add constrains in the $populate field in server side:

```javascript
{
    resources:{
      companies:{
        // use population object to stablish population constrains
        population:{
          
          // the populate resource that will be constrained when populated
          employees:{
            // this parameter allows you to add an extra query
            $match: {/* query */}
            
            // alternatively you can use an function with express request as a parameter
            $match(req){return {/* mongodb query */}}
            
            // this will sort by createdAt field in employeed document
            $sort: 'createdAt',
            
            // this will sort by desc "createdAt" order 
            $order: 'desc',
            
           // this will limit to a max of two items
            $limit: 2,
          }
        }
      }
    }
}
```



