# Getting started

Install mongo Server

```bash
npm install -g moser
```

Start Mongo Server

```bash
docker run -d -p 27017:27017 mongo # if you have docker but no mongodb
moser --mongo mongodb://localhost:27017
```

Now if you go to [http://localhost:3000/posts/](http://localhost:3000/posts/), you'll get

```javascript
[]
```

Also when doing requests, it's good to know that:

* If you make POST, PUT, PATCH or DELETE requests, changes will be stored on mongodb.
* Your request body JSON should be object enclosed, just like the GET output. \(for example `{"name": "Foobar"}`\)
* Id values are not mutable. Any `id` value in the body of your PUT or PATCH request will be ignored. Only a value set in a POST request will be respected, but only if not already taken.
* id values are currently saved as plain text, this probably will change in the

## CLI usage

```bash
Usage: mongodb-server [options]

  Options:                   Description:                Default:

    -V, --version            output the version number
    -c, --config <filePath>  Set a config file           undefined
    -p --port <number>       Server port                 3000
    -m --mongo <uri>         mongodb URI                 mongodb://localhost:27017
    -d --db <string>         database name               mongo-server
    -h, --help               output usage information
```

## Config file

You can also set options in a `js` or `json` configuration file.

```javascript
module.exports= {
  // Port, default 3000
  port: 3000,
  // REST api root, default "/"
  root: "/",
  // hostname
  host: 'http://localhost:3000',
  // mongodb url default: "mongodb://localhost:27088"
  mongo: 'mongodb://localhost:27088',
  // database name
  db:'dbName',
  // mongoDb client options
  // http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html#.connect
  mongoOptions: {},

  // enable cors using the cors module https://www.npmjs.com/package/cors
  cors: {origin:true},
  // enable gzip compression using the compression module https://www.npmjs.com/package/compression
  compress: {},
  // enable helmet module https://www.npmjs.com/package/helmet
  helmet: {},
  // static file server, by default is "public" in the execution dir
  static: 'public',
  // root path for static file serving, by default "/"
  staticRoot: '/',
  // personalized middleware, executed before REST api
  middleware: [myFunction],
  // Plugins, executed before REST api
  // plugins are functions that receives 3 arguments and returns express middleware
  // (config: MoserConfig, db: MongodbInstance, Client: MongodbClient)=> ExpressMiddleware || ExpressMiddleware[] 
  plugins: [myPluginFunction],
  // default pagination limit
  pagination: 10,
  // set as true to enable trust proxy on express
  trustProxy: false
  // custom error handler
  errorHandler: (req.res,next,err)=>{/* custom error handler */},
  
  // shutdown function, to gracefully stop the server
  // notice that this function returns another function
  shutdown: (config, ExpressServer, mongodbClient)=>()=>{/*custom shutdown function here  */}


  // extra settings
  settings:{
    // avoid $where queries (To Avoid noSQL attacks), is enabled by default
    restrictWhereQuery: true
  }
}
```

