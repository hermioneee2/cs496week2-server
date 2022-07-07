// const express = require('express')
// const app = express()

// const hostname = '172.10.5.98'
// const port = 443

// app.get('/', async (req, res) => {
//   res.send("hihi")
// });

// app.listen(port, () => {
//   console.log(`Server running at http://${hostname}:${port}/`)}
// );

const http = require('http')

const hostname = '172.10.5.98'
const port = 443

const server = http.createServer((req, res) => {
  res.statusCode = 200
  res.setHeader('Content-Type', 'text/plain')
  res.end('Hello World\n')
})

server.listen(port, () => {
  console.log(`Server running at http://${hostname}:${port}/`)
})