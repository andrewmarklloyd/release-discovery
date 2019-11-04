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

function getPlaylistIds(access_token) {
  spotifyApi.setAccessToken(access_token)
  return spotifyApi.getUserPlaylists(0, {limit: 50})
  .then(data => {
    let playlists = {}
    data.body.items.forEach(item => {
      switch (item.name) {
        case 'Release Radar':
          if (item.owner.id == 'spotify') {
            playlists.releaseRadar = item.id;
          }
          break;
        case 'Discover Weekly':
          if (item.owner.id == 'spotify') {
            playlists.spotifydiscover = item.id;
          }
          break;
        case 'Release Discovery':
          playlists.releaseDiscovery = item.id;
          break;
      }
    })
    var promises = [];
    var calls = Math.ceil(data.body.total / 50)
    for (var i = 1; i < calls; i++) {
      let promise = new Promise((resolve, reject) => {
        spotifyApi.getUserPlaylists(0, {limit: 50, offset: i * 50})
        .then(function(data){
          resolve(data.body.items);
        });
      });
      promises.push(promise);
    }

    return Promise.all(promises).then(values => {
      values.forEach(function(items) {
        items.forEach(item => {
          switch (item.name) {
            case 'Release Radar':
              if (item.owner.id == 'spotify') {
                playlists.releaseRadar = item.id;
              }
              break;
            case 'Discover Weekly':
              if (item.owner.id == 'spotify') {
                playlists.spotifydiscover = item.id;
              }
              break;
            case 'Release Discovery':
              playlists.releaseDiscovery = item.id;
              break;
          }
        })
      });
      return Promise.resolve(playlists)
    })
  })
}

function createAggregatePlaylist(userId, access_token, playlists) {
  spotifyApi.setAccessToken(access_token);
  return new Promise((resolve, reject) => {
    spotifyApi.createPlaylist(userId, 'Release Discovery', { 'public' : false })
      .then(result => {
        console.log(`Created playlist ${result.body.id} for ${userId}`)
        playlists.releaseDiscovery = result.body.id
        resolve(playlists)
      })
  })
}

// given access_token, userId, and playlistId, returns list of trackIds for the given playlistId
function getPlaylistTrackIds(access_token, userId, playlistId, callback) {
  spotifyApi.setAccessToken(access_token)
  let list = []
  return spotifyApi.getPlaylistTracks(playlistId)
  .then(function(data) {
    data.body.items.map(function(item) {
      if (item.track) {
        list.push(item.track.id)
      }
    })
    let promiseList = []
    for (var i = 1; i < (Math.ceil(data.body.total / 100)); i++) {
      offset = i * 100
      promiseList.push(spotifyApi.getPlaylistTracks(playlistId, {offset}))
    }
    return Promise.all(promiseList).then(results=> {
      results.forEach(result => {
        result.body.items.map(function(item) {
          if (item.track) {
            list.push(item.track.id)
          }
        })
      })
      return Promise.resolve(list);
    })
  })
}

// given access_token and listOfTrackIds, returns a subset of tracks contained in my saved tracks
function subsetOfMySavedTracks(access_token, listOfTrackIds) {
  spotifyApi.setAccessToken(access_token)
  let calls = Math.ceil(listOfTrackIds.length / 50)
  let promiseList = []
  for (var i = 0; i < calls; i++) {
    begin = i * 50
    end = begin + 50
    let sliceList = listOfTrackIds.slice(begin, end)
    promise = new Promise((resolve, reject) => {
      spotifyApi.containsMySavedTracks(sliceList)
        .then(containsTracks => {
          resolve({containsTracks, sliceList})
        })
    })
    promiseList.push(promise)
  }
  let subsetInMyTracks = []
  return Promise.all(promiseList).then(results=> {
    results.forEach(result => {
      for (var i in result.containsTracks.body) {
        if (result.containsTracks.body[i]) {
          subsetInMyTracks.push(result.sliceList[i])
        }
      }
    })
    return Promise.resolve(subsetInMyTracks)
  })
}

// given access_token, userId, candidateTrackIds, and playlistId, returns a subset of tracks that are NOT already in playlistId
function subsetOfPlaylistId(access_token, userId, candidateTrackIds, playlistId) {
  spotifyApi.setAccessToken(access_token)
  let subsetNotInPlaylist = [];
  return spotifyApi.getPlaylistTracks(playlistId, {limit: 100, offset: 0})
    .then(data => {
      subsetNotInPlaylist = subsetNotInPlaylist.concat(data.body.items);
      var promises = [];
      var calls = Math.ceil(data.body.total / 100)
      for (var i = 1; i < calls; i++) {
        let promise = new Promise((resolve, reject) => {
          spotifyApi.getPlaylistTracks(playlistId, {limit: 100, offset: i * 100})
          .then(function(data){
            resolve(data.body.items);
          });
        });
        promises.push(promise);
      }
      return Promise.all(promises).then(values => {
        values.forEach(function(item) {
          subsetNotInPlaylist = subsetNotInPlaylist.concat(item);
        });
        subsetNotInPlaylist.map(function(item) {
          var index = candidateTrackIds.indexOf(item.track.id);
          if (index > -1) {
            candidateTrackIds.splice(index, 1);
          }
        });
        if (candidateTrackIds.length > 0) {
          for (var i in candidateTrackIds) {
            candidateTrackIds[i] = 'spotify:track:' + candidateTrackIds[i];
          }
          return Promise.resolve(candidateTrackIds)
        } else {
          return Promise.resolve([])
        }
      })
    })
}


function addTracksToPlaylist(access_token, playlistId, playlistTrackIds) {
  spotifyApi.setAccessToken(access_token)
  return spotifyApi.addTracksToPlaylist(playlistId, playlistTrackIds)
}

module.exports = { getAuthUrl, exchangeAccessCodeForTokens, refreshAccessToken, getPlaylistIds, createAggregatePlaylist, getPlaylistTrackIds, subsetOfMySavedTracks, subsetOfPlaylistId, addTracksToPlaylist }
