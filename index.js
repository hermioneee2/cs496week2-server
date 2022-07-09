const express = require('express')
const url = require('url')
const bodyParser = require('body-parser')
const querystring = require('querystring')
const app = express()
app.use(bodyParser.urlencoded( { extended : false }))
app.use(bodyParser.json())

const hostname = '192.249.18.187'
const port = 443

// neo4j
const neo4j = require('neo4j-driver')
const personName = 'Taeyoung'

app.post('/Work/:name', async (req, res) => {
  let workAt = req.query.workAt
  let name = req.params.name

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')
})

app.post('/Person/:id', async (req, res) => {
  console.log(req.originalUrl)
  let getFriends = req.query.getFriends
  let requestId = req.params.id

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')

  const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "lhryty2"), { disableLosslessIntegers: true })
  const session = driver.session()

  try {
    const result = await session.run(
      `MERGE (p:Person {userID: $userID, name: $name, phone: $phone, email: $email, photoSrc: $photoSrc})
      RETURN p`,
      { 
        userID: req.body.properties.userID, 
        name: req.body.properties.name,
        phone: req.body.properties.phone,
        email: req.body.properties.email,
        photoSrc: req.body.properties.photoSrc
      }
    )
    res.json(result.records[0].get('p'))
    console.log(result.records[0].get('p'))
  } catch (e) {
    res.end(e.toString())
    console.log(e.toString())
  } finally {
    await session.close()
  }
  await driver.close()
})

app.get('/Person/:id', async (req, res) => {
  let getFriends = req.query.getFriends
  let requestId = req.params.id

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')

  const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "lhryty2"), { disableLosslessIntegers: true })
  const session = driver.session()

  try {
    if (getFriends) {
      const result = await session.run(
        'MATCH (p:Person {userID : $id})-[r:IS_FRIEND_OF]-(q:Person) RETURN q',
        { id: requestId }
      )
      if (result.records.length == 0) {
        res.json([])
      } else {
        const records = result.records
        const nodes = records.map (record => {
          return record.get('q')
        })
        res.json(nodes)
      }
    } else {
      const result = await session.run(
        'MATCH (p {userID : $id}) RETURN p',
        { id: requestId }
      )
      if (result.records.length == 0) {
        res.json({})
      } else {
        res.json(result.records[0].get('p'))
      }
    } 
  } catch (e) {
    res.end(e.toString())
  } finally {
    await session.close()
  }
  await driver.close()
});

app.listen(port, () => {
  console.log(`Server running at http://${hostname}:${port}/`)}
);