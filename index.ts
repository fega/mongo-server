
export interface Configuration {
  /** Port, default 3000 **/
  port?: number;
  /** REST api root, default "/" **/
  root?: string;
  /** hostname **/
  host?: string;
  // mongodb url default: "mongodb://localhost:27088"
  mongo?: string;
  // database name
  db?: string;
  /** enable cors using the cors module https://www.npmjs.com/package/cors **/
  cors: any;
  /** enable gzip compression using the compression module https://www.npmjs.com/package/compression **/
  compress: any;
  // enable helmet module https://www.npmjs.com/package/helmet
  helmet: any;
  // static file server, by default is "public" in the execution dir
  static: string;
  // root path for static file serving, by default "/"
  staticRoot: string;
  // personalized middleware, executed before REST api
  middleware: Array<(req: any, res: any, next: any) => any>;
  // default pagination limit
  pagination: number;
}

export class Moser {
  constructor(readonly config: Configuration) {

  }
}