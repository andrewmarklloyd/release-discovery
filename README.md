# Release Discovery
Release Discovery is a web application to help Spotify users save songs from the Discover Weekly and Release Radar playlists.

Every Monday and Friday Spotify's algorithm builds personalized playlists for users. Unfortunately these playlists don't persist past the week and if you don't save the songs elsewhere they disappear. Using Spotify's API and OAuth2, this application will cross references songs in the Discover Weekly and Release Radar playlists against songs listeners added to their library and adds them to a new playlist.

## Requirements
Node.js 8 and npm 5. You can use [nvm](https://github.com/nvm-sh/nvm#installation-and-update) to manage the Node.js installation. The application is deployed on Heroku and uses it to manage the api credentials for users. Eventually I will update the app to use an encrypted database solution.

## Installation and Running
```
# once nvm is installed:
nvm install v8.12.0
nvm use v8.12.0

# install dependencies
npm install

# use example .env file
cp .env.example .env

# run the web server with hot reload
npm run dev

# run the web server
npm start

# refresh access tokens
npm run refresh

# update all users's playlists
npm run playlist
```
