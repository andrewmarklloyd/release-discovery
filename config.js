// require and configure dotenv, will load vars in .env in PROCESS.ENV
require('dotenv').config();


const config = {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri: process.env.SPOTIFY_REDIRECT_URI
  },
};

module.exports = config
