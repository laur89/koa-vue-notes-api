'use strict';

import dotenv from 'dotenv'
dotenv.config()

//import('core-js');

const env = process.env.NODE_ENV || 'development';
const port = process.env.PORT || 4000;

const start = async koaApp => {
    //Here we're assigning the server to a variable because
    //we're going to want to manually rip down the server in testing
    const server = koaApp.listen(port);
    console.log('Server running at ' + port);
    console.log("Running in "  + process.env.NODE_ENV + " v" + process.env.npm_package_version);
    return server;
}



//export default await (async () => {
  //// await async dependencies
  //// export the module
  ////return {my: 'module'};
//})();

export default new Promise(async $export => {
  // await anything that needs to be imported
  // await anything that asynchronous
  // finally export the module resolving the Promise
  // as object, function, class, ... anything
  let i;
  if (env === 'production') {
    i = await import('./build/index.js').then(s => start(s.default))
  } else {
    i = await import('./src/index.js').then(s => start(s.default))
  }
  //console.log('yo:: ' + JSON.stringify(i))
  //console.log('yo:: ' + typeof(i.close))

  //Exporting the actual server here for testing availability: TODO: jest stil not working w/ our setup
  //$export({server: i});
  $export(i);
});

