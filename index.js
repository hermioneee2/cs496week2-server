const express = require('express')
const url = require('url')
const bodyParser = require('body-parser')
const querystring = require('querystring')
const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

const hostname = '192.249.18.187'
const port = 443

// neo4j
const neo4j = require('neo4j-driver')

// Receive a list of phone numbers, Send a list of corresponding Person Nodes.
app.post('/Person', async (req, res) => {
  let param1 = req.query.param1

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')

  const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "lhryty2"), { disableLosslessIntegers: true })
  const session = driver.session()
  const txc = session.beginTransaction();

  try {
    var arr = []
    // Person list corresponding to phone numbers list of param2
    if (param1 == 'getPhoneList') {
      req.body.forEach (async (phoneNumber) => {
        const result = await txc.run(
          `MATCH (p:Person {phone: $phone}), (q:Person {userID: $userID}) 
          WHERE NOT p.userID = q.userID
          MERGE (q)-[:IS_FRIEND_OF]->(p) RETURN p`,
          { phone: phoneNumber, userID: req.query.param2 }
        )
        const records = result.records
        if (records.length > 0) {
          arr.push(result.records[0].get('p'))
        }
      })
    // Person list that has corresponding tags
    } else if (param1 == 'getTagList') {
      const result = await txc.run(
        `MATCH (p:Person {userID: $userID})-[:IS_FRIEND_OF*1..2]->(q:Person)-[]-(h {name: $tag})
        WHERE NOT p.name = q.name RETURN q`,
        {
          userID: req.query.param2,
          tag: req.body[0]
        }
      )

      arr = result.records.map((record) => {
        return record.get('q')
      })
    } else {
      let result
      if (req.body.length == 0) {
        result = await txc.run(
          `MATCH (p:Person {userID: $userID}), (q:Person {userID: $userID2})
          MERGE (p)-[r:TEMP_LINK]->(q)
          RETURN p, q`,
          {
            userID: req.query.param1,
            userID2: req.query.param2
          }
        )
      } else {
        result = await txc.run(
          `MATCH (p:Person {userID: $userID})-[r:TEMP_LINK]->(q:Person {userID: $userID2})
          DELETE r
          RETURN p, q`,
          {
            userID: req.query.param1,
            userID2: req.query.param2
          }
        )
      }

      arr = [result.records[0].get('p'), result.records[0].get('q')]
      console.log(arr)
    }
    
    await txc.commit()
    console.log(req.query.param1 + " Committed")
    res.json(arr)
  } catch (e) {
    await txc.rollback()
    console.log(e.toString())
    console.log(arr)
    res.end(e.toString())
  } finally {
    await session.close()
  }
  await driver.close()
})

// Modify the profile of the specified user
app.post('/Person/:id', async (req, res) => {
  let requestId = req.params.id

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')

  const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "lhryty2"), { disableLosslessIntegers: true })
  const session = driver.session()
  const txc = session.beginTransaction();
  try {
    const result = await txc.run(
      `MERGE (p:Person {userID: $userID})
      SET p.name = $name, p.phone = $phone, p.email = $email, p.photoSrc = $photoSrc
      RETURN p`, 
      {
        userID: req.body.properties.userID,
        name: req.body.properties.name,
        phone: req.body.properties.phone,
        email: req.body.properties.email,
        photoSrc: req.body.properties.photoSrc
      }
    )

    req.body.work.forEach(async (work) => {
      const result = await txc.run(
        `MATCH (p:Person {userID: $userID})
        MERGE (q:Work {name: $name})
        MERGE path = (p)-[r:WORK_AT]->(q)
        RETURN path`,
        {
          userID: requestId,
          name: work
        }
      )
    })

    req.body.hobby.forEach(async (hobby) => {
      const result = await txc.run(
        `MATCH (p:Person {userID: $userID})
        MERGE (q:Hobby {name: $name})
        MERGE path = (p)-[r:HOBBY_AT]->(q)
        RETURN path`,
        {
          userID: requestId,
          name: hobby
        }
      )
    })

    req.body.area.forEach(async (area) => {
      const result = await txc.run(
        `MATCH (p:Person {userID: $userID})
        MERGE (q:Area {name: $name})
        MERGE path = (p)-[r:AREA_AT]->(q)
        RETURN path`,
        {
          userID: requestId,
          name: area
        }
      )
    })

    await txc.run(
      `MATCH (p:Person {userID: $userID})
      MERGE (q:Relationship {name: $name})
      MERGE path = (p)-[r:RELATIONSHIP_AT]->(q)
      RETURN path`,
      {
        userID: requestId,
        name: req.body.relationship
      }
    )

    await txc.commit()
    console.log("Comitted")

    res.json(result.records[0].get('p'))
  } catch (e) {
    res.end(e.toString())
    await txc.rollback()
    console.log(e.toString())
  } finally {
    await session.close()
  }
  await driver.close()
})

// Get the profile of the specified user
app.get('/Person/:id', async (req, res) => {
  let requestId = req.params.id
  let param1 = req.query.param1

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')

  const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "lhryty2"), { disableLosslessIntegers: true })
  const session = driver.session()
  const txc = session.beginTransaction()

  try {
    if (param1 == 'getFriends') {
      const result = await txc.run(
        'MATCH (p:Person {userID : $id})-[r:IS_FRIEND_OF*1..2]->(q:Person) WHERE NOT p.userID = q.userID RETURN DISTINCT q',
        { id: requestId }
      )
      if (result.records.length == 0) {
        res.json([])
      } else {
        const records = result.records
        const nodes = records.map(record => {
          return record.get('q')
        })
        res.json(nodes)
      }
    } else if (param1 == 'getUser') {
      const result = await txc.run(
        `MATCH (p {userID : $id}) 
        OPTIONAL MATCH (p)-[:WORK_AT|:HOBBY_AT|:RELATIONSHIP_AT|:AREA_AT]->(q)
        RETURN p, q`,
        { id: requestId }
      )
      if (result.records.length == 0) {
        res.json({})
      } else {
        const records = result.records
        const node = records[0].get('p')
        const nonPersons = records.map((record) => { return record.get('q') })
        res.json({
          identity: node.identity,
          labels: node.labels,
          properties: node.properties,
          work: nonPersons.filter(node => node.labels[0] == 'Work').map(node => node.properties.name),
          hobby: nonPersons.filter(node => node.labels[0] == 'Hobby').map(node => node.properties.name),
          area: nonPersons.filter(node => node.labels[0] == 'Area').map(node => node.properties.name),
          relationship: nonPersons.filter(node => node.labels[0] == 'Relationship')[0].properties.name
        })
      }
    } else if (param1 == 'getTempLinks') {
      const result = await txc.run(
        `MATCH (p:Person {userID : $id})-[:IS_FRIEND_OF]->(q:Person)-[:TEMP_LINK]->(r:Person)<-[:IS_FRIEND_OF]-(p)
        RETURN q, r`,
        { id: requestId }
      )
      if (result.records.length == 0) {
        res.json([])
      } else {
        const records = result.records
        const nodes = records.map(record => {
          return [record.get('q'), record.get('r')]
        })
        res.json(nodes)
        console.log(nodes)
      }
    }

    await txc.commit()
    console.log("GET USER Committed")
  } catch (e) {
    await txc.rollback()
    res.end(e.toString())
    console.log(e.toString())
  } finally {
    await session.close()
  }
  await driver.close()
});

// Get all tags
app.get('/Tag', async (req, res) => {
  let param1 = req.query.param1
  let param2 = req.query.param2

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json')

  const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "lhryty2"), { disableLosslessIntegers: true })
  const session = driver.session()
  const txc = session.beginTransaction()

  try {
    if (param1 == 'getTags') {
      const result = await txc.run(
        'MATCH (t:' + param2 + ') RETURN t.name'
      )
      if (result.records.length == 0) {
        res.json([])
      } else {
        const records = result.records
        const nodes = records.map(record => {
          return record.get('t.name')
        })
        res.json(nodes)
        console.log(nodes)
      }
    }

    await txc.commit()
    console.log("GET TAG Committed")
  } catch (e) {
    await txc.rollback()
    res.end(e.toString())
    console.log(e.toString())
  } finally {
    await session.close()
  }
  await driver.close()
});

app.listen(port, () => {
  console.log(`Server running at http://${hostname}:${port}/`)
}
);