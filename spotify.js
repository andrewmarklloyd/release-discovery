const SpotifyWebApi = require('spotify-web-api-node');
const uuid = require('uuid/v1');
const config = require('./config');

const scopes = ['user-read-private', 'user-read-email', 'playlist-read-private', 'user-library-read', 'playlist-modify-private', 'playlist-modify-public'];

const spotifyApi = new SpotifyWebApi({
  redirectUri : config.spotify.redirectUri,
  clientId : config.spotify.clientId,
  clientSecret: config.spotify.clientSecret
})


function getAuthUrl(authType) {
  var state;
  switch (authType) {
    case 'login':
      state = 'login';
      break;
    case 'register':
      state = 'register';
      break;
    default:
      state = uuid();
      break;
  }
  return spotifyApi.createAuthorizeURL(scopes, state);
}

function exchangeAccessCodeForTokens(accessCode) {
  var resp;
  return spotifyApi.authorizationCodeGrant(accessCode)
  .then(response => {
    resp = response;
    spotifyApi.setAccessToken(response.body.access_token)
    return spotifyApi.getMe()
  }).then(function(data) {
    resp.body.userId = data.body.id;
    return Promise.resolve(resp);
  });
}

function refreshAccessToken(refreshToken) {
  return new Promise((resolve, reject) => {
    spotifyApi.setRefreshToken(refreshToken);
    spotifyApi.refreshAccessToken()
    .then((data) => {
      resolve(data)
    })
  })
}

function getPlaylistIds(userId, access_token, callback, result, options) {
  var options = options ? options : {limit: 50, offset: 0}
  var result = result ? result : {access_token, userId}
  _privateGetPlaylistIds(access_token, options, result).then(result => {
    if (result.next && !result.releaseRadar && !result.spotifydiscover) {
      options.offset += 10;
      getPlaylistIds(null, access_token, callback, result, options)
    } else {
      callback(null, result)
    }
  }).catch(err => {
    callback(err)
  })
}

function _privateGetPlaylistIds(access_token, options, result) {
  return new Promise((resolve, reject) => {
    spotifyApi.setAccessToken(access_token);
    spotifyApi.getUserPlaylists(0, options)
    .then(data => {
      for (var d in data.body.items) {
        switch (data.body.items[d].name) {
          case 'Release Radar':
            if (data.body.items[d].owner.id == 'spotify') {
              result.releaseRadar = data.body.items[d].id;
            }
            break;
          case 'Discover Weekly':
            if (data.body.items[d].owner.id == 'spotify') {
              result.spotifydiscover = data.body.items[d].id;
            }
            break;
          case 'Release Discovery':
            result.releaseDiscovery = data.body.items[d].id;
            break;
        }
      }
      result.next = data.body.next;
      resolve(result)
    })
    .catch(err => {
      reject(err)
    })
  })
}

function createAggregatePlaylist(userId, access_token) {
  spotifyApi.setAccessToken(access_token);
  return spotifyApi.createPlaylist(userId, 'Release Discovery', { 'public' : false });
}

// given access_token, userId, and playlistId, returns list of trackIds for the given playlistId
function getPlaylistTrackIds(access_token, userId, playlistId) {
  spotifyApi.setAccessToken(access_token)
  return spotifyApi.getPlaylist(playlistId)
  .then(function(data) {
    let list = []
    data.body.tracks.items.map(function(item) {
      if (item.track) {
        list.push(item.track.id)
      }
    })
    return Promise.resolve(list);
  })
}

// given access_token and listOfTrackIds, returns a subset of tracks contained in my saved tracks
function subsetOfMySavedTracks(access_token, listOfTrackIds) {
  spotifyApi.setAccessToken(access_token)
  var items = list;
  return spotifyApi.containsMySavedTracks(list)
    .then(data => {
      let subsetInMyTracks = []
      for (var i in data.body) {
        if (data.body[i]) {
          subsetInMyTracks.push(items[i])
        }
      }
      return Promise.resolve(subsetInMyTracks)
    })
}

// given access_token, userId, candidateTrackIds, and playlistId, returns a subset of tracks that are NOT already in playlistId
function subsetOfPlaylistId(access_token, userId, candidateTrackIds, playlistId) {
  spotifyApi.setAccessToken(access_token)
  let subsetNotInPlaylist = [];
  return spotifyApi.getPlaylistTracks(userId, playlistId, {limit: 100, offset: 0})
    .then(data => {
      subsetNotInPlaylist = subsetNotInPlaylist.concat(data.body.items);
      var promises = [];
      var calls = Math.ceil(data.body.total / 100)
      for (var i = 1; i < calls; i++) {
        var promise = new Promise((resolve, reject) => {
          spotifyApi.getPlaylistTracks(userId, playlistId, {limit: 100, offset: i * 100})
          .then(function(data){
            resolve(data.body.items);
          });
        });
        promises.push(promise);
      }
      Promise.all(promises).then(values => {
        values.forEach(function(item) {
          subsetNotInPlaylist = subsetNotInPlaylist.concat(item);
        });
        subsetNotInPlaylist.map(function(item) {
          var index = candidateTrackIds.indexOf(item.track.id);
          if (index > -1) {
            candidateTrackIds.splice(index, 1);
          }
        });
        if (tracksToAdd.length > 0) {
          for (var i in tracksToAdd) {
            tracksToAdd[i] = 'spotify:track:' + tracksToAdd[i];
          }
        }
      })
    })
}


function addTracksToPlaylist(access_token, userId, playlistId, playlistTrackIds) {
  spotifyApi.setAccessToken(access_token)
  return spotifyApi.addTracksToPlaylist(userId, playlistId, playlistTrackIds)
}

module.exports = { getAuthUrl, exchangeAccessCodeForTokens, refreshAccessToken, getPlaylistIds, createAggregatePlaylist, getPlaylistTrackIds, subsetOfMySavedTracks, subsetOfPlaylistId, addTracksToPlaylist }
