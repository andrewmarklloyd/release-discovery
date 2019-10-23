const Heroku = require('heroku-client')
const heroku = new Heroku({ token: process.env.HEROKU_API_TOKEN })


function updateConfigVars(key, value) {
  return new Promise((resolve, reject) => {
    var body = {}
    body[key] = value
    heroku.patch(`/apps/spotify-config/config-vars`, {body})
    .then(result => {
      resolve();
    })
    .catch(e => {
      reject(e);
    })
  })
}


function getConfigVar(key) {
  return new Promise((resolve, reject) => {
    heroku.get(`/apps/spotify-config/config-vars`)
    .then(result => {
      resolve(result[key]);
    })
    .catch(e => {
      reject(e);
    })
  })
}

function getAllConfigVars() {
  return new Promise((resolve, reject) => {
    heroku.get(`/apps/spotify-config/config-vars`)
    .then(result => {
      resolve(result);
    })
    .catch(e => {
      reject(e);
    })
  })
}


module.exports.updateConfigVars = updateConfigVars;
module.exports.getConfigVar = getConfigVar;
module.exports.getAllConfigVars = getAllConfigVars;
