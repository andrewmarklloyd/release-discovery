const Mustache = require('mustache')
const fs = require('fs')
var base = fs.readFileSync('./templates/base.mustache').toString()

function render(page) {
  let options = {}
  options[page] = true
  fs.writeFileSync(`./public/${page}.html`, Mustache.render(base, options))
}

const pages = ['home', 'index']
pages.forEach(page => {
  render(page)
})
