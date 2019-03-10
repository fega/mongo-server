# Login and authentication

The majority of systems needs a way to identify and authenticate user, with Moser you can activate an auth system based on JWT just adding one option in your config file

```javascript
module.exports= {
  resources: {
    users:{
      auth:{
        local:['email','password']
      }
    }
  },
  jwtSecret: 'secret', // by default is "secret", used to sign token
  bcryptRounds:1, //used to hash passwords by default is 1
}
```

using this you can call the endpoint `POST /auth/users/sign-up` to create an user and `POST /auth/users/log-in` to authenticate, after that, you will get a $token parameter in your log-in response, check the next section to know how to restrict access to your endpoints

