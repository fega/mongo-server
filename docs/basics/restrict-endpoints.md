# Restrict endpoints

You can restrict the endpoints for only what you provided using the restrict option in your config file:

```javascript
module.exports= {
  restrict: true,
  resources: ['users','dogs']
  // or
  resources: {
    users: true,
    dogs: true,
  }
}
```

