# RoadMap

## Web page

## Facebook Auth

## Google Auth

## Oauth2 Auth

## Email verification

## Magic Code auth

## Magic link auth

This Auth strategy creates and send a magic link to the email provided by the client

```http

POST /auth/magic-link/
{
  "email":"user@email.com"
}

GET /auth/magic-link/verify/:token

GET /auth/magic-link/get/:token
```

```javascript
module.exports={
  resources:{
    user:{
      auth:{
        magicLink:{
          // field to check in request and user document
          emailField: 'email',
          // where to store the magic links in the db
          collection: 'moser-magic-links',
          // max tokens actives allowed per user
          max: 3,
          // how many time the tokens will be active
          exp: 'in one day',
          // where to redirect if the user is not found
          redirectNotFound: null,
          // where to redirect if the token was already used
          redirectAlreadyUsed: null,
          // where to redirect on success
          redirectSuccess: null,
          // function to execute on verify
          doVerify: null,
          // function to execute on token generation          
          doGenerate: null,
          // function to execute on token retrieve
          doRetrieve: null,
          // email options as nodemailer sendMail function https://nodemailer.com/about/
          email: Object.assign({}, {
            from: 'email@email.com',
            text: (user, token, url) => `${url}`,
            html: (user, token, url) => `${url}`,
            subject: 'Hey! use this link to login in our app',
          }),

          }
        }
      }
    }
  }
  
}

```