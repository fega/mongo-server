// eslint-disable-next-line
const gdemo = new GDemo('[data-demo-container]');

gdemo
  .openApp('terminal', { minHeight: '400px', promptString: '$' })
  .command('moser &', { onCompleteDelay: 1000 })
  .respond('[m-server] connecting to local mongodb', { onCompleteDelay: 1000 })
  .respond('[m-server] using mongo-server database', { onCompleteDelay: 600 })
  .respond('[m-server] server listen on port 3000', { onCompleteDelay: 1000 })
  .command('curl -X POST http://localhost:3000/dogs -d \'{"name":"bobby"}\'', { onCompleteDelay: 300 })
  .respond('{"name":"bobby","_id":"5bdf8d43a7481b5e3a2e5a78"}', { onCompleteDelay: 1000 })
  .command('curl -X GET http://localhost:3000/dogs', { onCompleteDelay: 300 })
  .respond('[{"name":"bobby","_id":"5bdf8d43a7481b5e3a2e5a78"}]')
  .end();
