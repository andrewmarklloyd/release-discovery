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
    res.send('<h1>Click below to register</h1><form action="/register"><input type="submit" value="Register"/></form>')
  });

  app.get('/register', (req, res) => {
    res.redirect(spotifyClient.getAuthUrl('register'))
  });

  app.get('/callback', (req, res) => {
    spotifyClient.exchangeAccessCodeForTokens(req.query.code)
      .then(result => {
        createPlaylist(result.body)
          .then(playlistId => {
            result.body.playlistId = playlistId
            herokuClient.updateConfigVars(result.body.userId, JSON.stringify(result.body))
            res.redirect('/home');
          })
          .catch(err => {
            console.log(err)
            res.redirect('/home');
          })
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
        let info = JSON.parse(data[k])
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
  herokuClient.getAllConfigVars()
    .then(data => {
      const keys = Object.keys(data)
      keys.forEach(k => {
        let info = JSON.parse(data[k])
        console.log(info.playlistId)
      })
    })
}

function createPlaylist(info) {
  return new Promise((resolve, reject) => {
    spotifyClient.getPlaylistIds(info.userId, info.access_token, (err, data) => {
      if (err) {
        reject(err);
      } else {
        if (data.releaseDiscovery) {
          resolve(data.releaseDiscovery);
        } else {
          return spotifyClient.createAggregatePlaylist(data.userId, data.accessToken)
        }
      }
    })
  })
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
