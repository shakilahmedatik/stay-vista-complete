const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')
const port = process.env.PORT || 9000
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const nodemailer = require('nodemailer')
// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

// Send email
const sendEmail = (emailAddress, emailData) => {
  //Create a transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.MAIL,
      pass: process.env.PASS,
    },
  })

  //verify connection
  transporter.verify((error, success) => {
    if (error) {
      console.log(error)
    } else {
      console.log('Server is ready to take our emails', success)
    }
  })

  const mailBody = {
    from: process.env.MAIL,
    to: emailAddress,
    subject: emailData?.subject,
    html: `<p>${emailData?.message}</p>`,
  }

  transporter.sendMail(mailBody, (error, info) => {
    if (error) {
      console.log(error)
    } else {
      console.log('Email sent: ' + info.response)
    }
  })
}
const client = new MongoClient(process.env.DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {
    const usersCollection = client.db('stayVistaDb').collection('users')
    const roomsCollection = client.db('stayVistaDb').collection('rooms')
    const bookingsCollection = client.db('stayVistaDb').collection('bookings')

    // Role verification middlewares
    // For admins
    const verifyAdmin = async (req, res, next) => {
      const user = req.user
      console.log('user from verify admin', user)
      const query = { email: user?.email }
      const result = await usersCollection.findOne(query)
      if (!result || result?.role !== 'admin')
        return res.status(401).send({ message: 'unauthorized access' })
      next()
    }
    // For hosts
    const verifyHost = async (req, res, next) => {
      const user = req.user
      const query = { email: user?.email }
      const result = await usersCollection.findOne(query)
      if (!result || result?.role !== 'host')
        return res.status(401).send({ message: 'unauthorized access' })
      next()
    }

    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body
      console.log('I need a new jwt', user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
        console.log('Logout successful')
      } catch (err) {
        res.status(500).send(err)
      }
    })
    // Save or modify user email, status in DB
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email: email }
      const options = { upsert: true }
      const isExist = await usersCollection.findOne(query)
      console.log('User found?----->', isExist)
      if (isExist) {
        if (user?.status === 'Requested') {
          const result = await usersCollection.updateOne(
            query,
            {
              $set: user,
            },
            options
          )
          return res.send(result)
        } else {
          return res.send(isExist)
        }
      }
      const result = await usersCollection.updateOne(
        query,
        {
          $set: { ...user, timestamp: Date.now() },
        },
        options
      )
      res.send(result)
    })
    // Get user role
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const result = await usersCollection.findOne({ email })
      res.send(result)
    })
    // Get all users
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      const result = await usersCollection.find().toArray()
      res.send(result)
    })
    // Update user role
    app.put('/users/update/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const user = req.body
      const query = { email: email }
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })
    // Get all rooms
    app.get('/rooms', async (req, res) => {
      const result = await roomsCollection.find().toArray()
      res.send(result)
    })
    //get rooms for host
    app.get('/rooms/:email', verifyToken, verifyHost, async (req, res) => {
      const email = req.params.email
      const result = await roomsCollection
        .find({ 'host.email': email })
        .toArray()
      res.send(result)
    })
    // Get single room data
    app.get('/room/:id', async (req, res) => {
      const id = req.params.id
      const result = await roomsCollection.findOne({ _id: new ObjectId(id) })
      res.send(result)
    })
    // Save a room in database
    app.post('/rooms', verifyToken, async (req, res) => {
      const room = req.body
      const result = await roomsCollection.insertOne(room)
      res.send(result)
    })
    // Update A room
    app.put('/rooms/:id', verifyToken, async (req, res) => {
      const room = req.body
      console.log(room)

      const filter = { _id: new ObjectId(req.params.id) }
      const options = { upsert: true }
      const updateDoc = {
        $set: room,
      }
      const result = await roomsCollection.updateOne(filter, updateDoc, options)
      res.send(result)
    })
    // delete a room
    app.delete('/rooms/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await roomsCollection.deleteOne(query)
      res.send(result)
    })
    // Generate client secret for stripe payment
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const { price } = req.body
      const amount = parseInt(price * 100)
      if (!price || amount < 1) return
      const { client_secret } = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card'],
      })
      res.send({ clientSecret: client_secret })
    })
    // Save booking info in booking collection
    app.post('/bookings', verifyToken, async (req, res) => {
      const booking = req.body
      const result = await bookingsCollection.insertOne(booking)
      // Send Email.....
      if (result.insertedId) {
        // To guest
        sendEmail(booking.guest.email, {
          subject: 'Booking Successful!',
          message: `Room Ready, chole ashen vai, apnar Transaction Id: ${booking.transactionId}`,
        })

        // To Host
        sendEmail(booking.host, {
          subject: 'Your room got booked!',
          message: `Room theke vago. ${booking.guest.name} ashtese.....`,
        })
      }
      res.send(result)
    })
    // Update room booking status
    app.patch('/rooms/status/:id', async (req, res) => {
      const id = req.params.id
      const status = req.body.status
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          booked: status,
        },
      }
      const result = await roomsCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    // Get all bookings for guest
    app.get('/bookings', verifyToken, async (req, res) => {
      const email = req.query.email
      if (!email) return res.send([])
      const query = { 'guest.email': email }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })
    // Get all bookings for host
    app.get('/bookings/host', verifyToken, verifyHost, async (req, res) => {
      const email = req.query.email
      if (!email) return res.send([])
      const query = { host: email }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })
    // delete a booking
    app.delete('/bookings/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })
    // Admin Stat Data
    app.get('/admin-stat', verifyToken, verifyAdmin, async (req, res) => {
      const bookingsDetails = await bookingsCollection
        .find({}, { projection: { date: 1, price: 1 } })
        .toArray()
      const userCount = await usersCollection.countDocuments()
      const roomCount = await roomsCollection.countDocuments()
      const totalSale = bookingsDetails.reduce(
        (sum, data) => sum + data.price,
        0
      )

      const chartData = bookingsDetails.map(data => {
        const day = new Date(data.date).getDate()
        const month = new Date(data.date).getMonth() + 1
        return [day + '/' + month, data.price]
      })
      chartData.unshift(['Day', 'Sale'])
      res.send({
        totalSale,
        bookingCount: bookingsDetails.length,
        userCount,
        roomCount,
        chartData,
      })
    })
    // Host Statistics
    app.get('/host-stat', verifyToken, verifyHost, async (req, res) => {
      const { email } = req.user

      const bookingsDetails = await bookingsCollection
        .find(
          { host: email },
          {
            projection: {
              date: 1,
              price: 1,
            },
          }
        )
        .toArray()
      const roomCount = await roomsCollection.countDocuments({
        'host.email': email,
      })
      const totalSale = bookingsDetails.reduce(
        (acc, data) => acc + data.price,
        0
      )
      const chartData = bookingsDetails.map(data => {
        const day = new Date(data.date).getDate()
        const month = new Date(data.date).getMonth() + 1
        return [day + '/' + month, data.price]
      })
      chartData.splice(0, 0, ['Day', 'Sale'])
      const { timestamp } = await usersCollection.findOne(
        { email },
        {
          projection: {
            timestamp: 1,
          },
        }
      )
      res.send({
        totalSale,
        bookingCount: bookingsDetails.length,
        roomCount,
        chartData,
        hostSince: timestamp,
      })
    })
    // Guest Statistics
    app.get('/guest-stat', verifyToken, async (req, res) => {
      const { email } = req.user

      const bookingsDetails = await bookingsCollection
        .find(
          { 'guest.email': email },
          {
            projection: {
              date: 1,
              price: 1,
            },
          }
        )
        .toArray()

      const chartData = bookingsDetails.map(data => {
        const day = new Date(data.date).getDate()
        const month = new Date(data.date).getMonth() + 1
        return [day + '/' + month, data.price]
      })
      chartData.splice(0, 0, ['Day', 'Reservation'])
      const { timestamp } = await usersCollection.findOne(
        { email },
        {
          projection: {
            timestamp: 1,
          },
        }
      )
      const totalSpent = bookingsDetails.reduce(
        (acc, data) => acc + data.price,
        0
      )
      res.send({
        bookingCount: bookingsDetails.length,
        chartData,
        guestSince: timestamp,
        totalSpent,
      })
    })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from StayVista Server..')
})

app.listen(port, () => {
  console.log(`StayVista is running on port ${port}`)
})
