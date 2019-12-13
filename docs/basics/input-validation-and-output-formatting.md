# Input validation and Output Formatting

In a production environment you should never trust in your incoming data, so here you can validate the incoming data easily using the Joi library \(you need to install it\):

```javascript
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

