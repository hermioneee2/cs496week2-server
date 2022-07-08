const express = require('express')
const url = require('url')
const bodyParser = require('body-parser')
const querystring = require('querystring')
const app = express()
app.use(bodyParser.urlencoded( { extended : false }))
app.use(bodyParser.json())

const hostname = '172.10.5.98'
const port = 443

// neo4j
const neo4j = require('neo4j-driver')
const personName = 'Taeyoung'

app.get('/:id', async (req, res) => {
  let newUser = req.query.newUser
  let id = req.params.id

  console.log(newUser.toString())
  console.log(id)

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')

  const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "lhryty2"))
  const session = driver.session()
  try {
    const result = await session.run(
      'MATCH path = (p {name : $name})-[r]-(q) RETURN p,r,q,path',
      { name: personName }
    )

    const record = result.records[0]
    const path = record.get('path')
  
    res.json({
      start: path.start,
      end: path.end,
      length: path.length
    })
  } catch (e) {
    res.end(e.toString())
  } finally {
    await session.close()
  }
  
  // on application exit:
  await driver.close()
});

app.listen(port, () => {
  console.log(`Server running at http://${hostname}:${port}/`)}
);