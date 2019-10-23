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

// function getPlaylistIds(accessToken, callback, result, options) {
//   var options = options ? options : {limit: 50, offset: 0}
//   var result = result ? result : {}
//   this._privateGetPlaylistIds(accessToken, options, result).then(result => {
//     if (result.next && !result.releaseRadar && !result.spotifydiscover) {
//       options.offset += 10;
//       this.getPlaylistIds(accessToken, callback, result, options)
//     } else {
//       callback(null, result)
//     }
//   }).catch(err => {
//     callback(err)
//   })
// }
//
// function _privateGetPlaylistIds(accessToken, options, result) {
//   return new Promise((resolve, reject) => {
//     spotifyApi.setAccessToken(accessToken);
//     spotifyApi.getUserPlaylists(0, options)
//     .then(data => {
//       for (var d in data.body.items) {
//         switch (data.body.items[d].name) {
//           case 'Release Radar':
//             if (data.body.items[d].owner.id == 'spotify') {
//               result.releaseRadar = data.body.items[d].id;
//             }
//             break;
//           case 'Discover Weekly':
//             if (data.body.items[d].owner.id == 'spotify') {
//               result.spotifydiscover = data.body.items[d].id;
//             }
//             break;
//           case 'Release Discovery':
//             result.releaseDiscovery = data.body.items[d].id;
//             break;
//         }
//       }
//       result.next = data.body.next;
//       resolve(result)
//     })
//     .catch(err => {
//       reject(err)
//     })
//   })
// }
//
// function createAggregatePlaylist(userId, accessToken, refreshToken) {
//   spotifyApi.setAccessToken(accessToken);
//   return spotifyApi.createPlaylist(userId, 'Release Discovery', { 'public' : false });
// }
//
// function getAggregatePlaylist(userId, accessToken, refreshToken) {
//   spotifyApi.setAccessToken(accessToken);
//   return spotifyApi.createPlaylist(userId, 'Release Discovery', { 'public' : false });
// }


module.exports = { getAuthUrl, exchangeAccessCodeForTokens, refreshAccessToken }
