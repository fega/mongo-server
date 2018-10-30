/**
 * Allows the use of express async handlers
 * @param {expressHandler} asyncFn Express handler
 */
exports.asyncController = asyncFn => (req, res, next) => Promise
  .resolve(asyncFn(req, res, next)).catch(next);

exports.htmlEmailTemplate = (path, body) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="ie=edge"/>
  <title>Document</title>
</head>
<body>
  <h1>Somebody send a POST ${path}</h1>
  <h2>Body</h2>
  <pre style="background-color:#eee;padding:10px">${JSON.stringify(body, null, 2)}</pre>
</body>
</html>
`;
