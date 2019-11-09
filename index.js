require('dotenv').config();
const bodyParser = require('body-parser');
const express = require('express');
const herokuClient = require('./heroku');
const spotifyClient = require('./spotify');
var path = require('path');


function startServer() {
  const app = express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get('/test', (req, res) => {
    res.send('<h1>Testing!</h1>')
  });

  app.use('/', express.static('public'))

  app.get('/register', (req, res) => {
    res.redirect(spotifyClient.getAuthUrl('register'))
  });

  app.get('/callback', (req, res) => {
    spotifyClient.exchangeAccessCodeForTokens(req.query.code)
      .then(result => {
        createPlaylist(result.body)
          .then(playlists => {
            result.body.playlists = playlists
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
    res.sendFile(path.join(__dirname + '/public/home.html'));
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
        let userInfo = JSON.parse(data[k])
        let access_token = userInfo.access_token
        let userId = userInfo.userId
        let releaseDiscovery = userInfo.playlists.releaseDiscovery
        let releaseRadar = userInfo.playlists.releaseRadar
        let spotifydiscover = userInfo.playlists.spotifydiscover
        let savedTracks = []
        console.log(`Running script for user ${userId}`)
        spotifyClient.getPlaylistTrackIds(access_token, userId, releaseRadar)
          .then(releaseRadarTrackIds => {
            return spotifyClient.subsetOfMySavedTracks(access_token, releaseRadarTrackIds)
          })
          .then(releaseRadarSavedTracks => {
            console.log(`${userId} releaseRadarSavedTracks: ${releaseRadarSavedTracks.length}`)
            Array.prototype.push.apply(savedTracks, releaseRadarSavedTracks)
            return spotifyClient.getPlaylistTrackIds(access_token, userId, spotifydiscover)
          })
          .then(spotifydiscoverTrackIds => {
            return spotifyClient.subsetOfMySavedTracks(access_token, spotifydiscoverTrackIds)
          })
          .then(spotifydiscoverSavedTracks => {
            console.log(`${userId} spotifydiscoverSavedTracks: ${spotifydiscoverSavedTracks.length}`)
            Array.prototype.push.apply(savedTracks, spotifydiscoverSavedTracks);
            return spotifyClient.subsetOfPlaylistId(access_token, userId, savedTracks, releaseDiscovery)
          })
          .then(newTracksToAdd => {
            if (newTracksToAdd.length > 0) {
              console.log(`adding ${newTracksToAdd.length} song(s) to playlist for ${userId}`)
              spotifyClient.addTracksToPlaylist(access_token, releaseDiscovery, newTracksToAdd)
                .then(d => {
                  console.log(`User ${userId}'s playlist was updated. Snapshot id: ${d.body.snapshot_id}`)
                })
            } else {
              console.log(`all songs already added, no more tracks to add for ${userId}`)
            }
          })
      })
    })
}

function createPlaylist(info) {
  return new Promise((resolve, reject) => {
    spotifyClient.getPlaylistIds(info.access_token)
      .then(playlists => {
        if (playlists.releaseDiscovery) {
          resolve(playlists);
        } else {
          spotifyClient.createAggregatePlaylist(info.userId, info.access_token, playlists)
            .then(updatedPlaylists => {
              resolve(updatedPlaylists)
            })
        }
      })
      .catch(e => {
        console.log(e)
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
