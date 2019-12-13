# Mailing settings

### Mailing

You can create a mailing service that sends you an email when a POST request hit the specified resource, using a Nodemailer instance:

```javascript
module.exports= {
    resources: {
      dogs: {
        // this option will do the trick
        email: {
          to: ['fega.hg@gmail.com'],
          title: 'An optional title'
        }
      },
    },
    nodemailer: {
      // place here your nodemailer configuration
      service: 'MailDev',
    },
  }
```

This option could be helpful for landing pages.

