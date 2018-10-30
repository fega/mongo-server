# RoadMap

## Web page

## Facebook Auth

## Google Auth

## Oauth2 Auth

## Email verification

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
          do: ()=>{
            /* custom logic here when the user */
          }
          emailField: 'email' //how the user will be created/find on mongodb
          exp: '15 min' // magic link expiration
          max: 3, // max active magic links
          redirectTo: '' //
          template: ({req,res,user,token})=>`html email template`
        }
      }
    }
  }
  
}

```