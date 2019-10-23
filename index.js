require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const herokuClient = require('./heroku');
const spotifyClient = require('./spotify');

function startServer() {
  const app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/', (req, res) => {
    res.redirect(spotifyClient.getAuthUrl('register'))
  });

  app.get('/callback', (req, res) => {
    spotifyClient.exchangeAccessCodeForTokens(req.query.code)
      .then(result => {
        herokuClient.updateConfigVars(result.body.userId, JSON.stringify(result.body))
        res.redirect('/home');
      })
      .catch(err => {
        console.log(err)
        res.json({result: 'error'})
      })
  });

  app.get('/home', (req, res) => {
    res.send("<h1>You've successfully registered!</h1>")
  });

  app.listen(process.env.PORT, () => {
    console.info(`server started: http://localhost:${process.env.PORT}`);
  });
}

function refreshAllTokens() {
  herokuClient.getAllConfigVars()
    .then(data => {
      const keys = Object.keys(data)
      var info
      keys.forEach(k => {
        info = JSON.parse(data[k])
        spotifyClient.refreshAccessToken(info.refresh_token)
          .then(token => {
            info.access_token = token.body.access_token
            tokenString = JSON.stringify(info)
            herokuClient.updateConfigVars(info.userId, tokenString)
          })
      })
    })
}

function updatePlaylist() {
  console.log('updating playlist')
}


const appType = process.argv[2];
switch (appType) {
  case 'server':
    startServer();
    break;
  case 'playlist':
    updatePlaylist();
    break;
  case 'refresh':
    refreshAllTokens();
    break;
  default:
}
