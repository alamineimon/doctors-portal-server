const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { query } = require("express");
const port = process.env.PORT || 5000;

const app = express();

//middle ware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.juguzvf.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

//JWT token generate function
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send("unauthorize access");
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    const appoinmentOptionCollection = client
      .db("doctorPortal")
      .collection("appointmentOptions");
    const bookingCollection = client.db("doctorPortal").collection("booking");
    const usersCollection = client.db("doctorPortal").collection("uses");
    const doctorsCollection = client.db("doctorPortal").collection("doctors");


    //use aggregate query multiple collection and then merg date
    app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      const query = {};
      const options = await appoinmentOptionCollection.find(query).toArray();
      //get the bookings of the provided date
      const bookingQuery = { appoinment: date };
      const alreadyBooked = await bookingCollection
        .find(bookingQuery)
        .toArray();
      //code carefully :xD
      options.forEach((option) => {
        const optionBooked = alreadyBooked.filter(
          (book) => book.treatment === option.name
        );
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        option.slots = remainingSlots;
      });
      res.send(options);
    });

// get booking dta by specialty
    app.get('/appointmentSpecialty', async(req, res) => {
      const query = {}
      const result = await appoinmentOptionCollection.find(query).project({ name: 1 }).toArray()
      res.send(result)
    })

    // get booking data by email with JWTToken virify
    app.get("/booking", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ mes: "forbidden acces" });
      }
      const query = { email: email };
      const booking = await bookingCollection.find(query).toArray();
      res.send(booking);
    });

    // post boking data
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        appoinment: booking.appoinment,
        email: booking.email,
        treatment: booking.treatment,
      };

      const alreadybooked = await bookingCollection.find(query).toArray();
      if (alreadybooked.length) {
        const message = `You already have a booking on `;
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    //jwt token generator
    app.get("/jwt", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
          expiresIn: "5d",
        });
        return res.send({ accessToken: token });
      }
      res.status(403).send({ accessToken: "" });
    });

    //gett all user
    app.get('/users', async (req, res) => {
      const query = {}
      const users = await usersCollection.find(query).toArray()
      res.send(users)
    })

    //get user by id
    app.get('/users/admin/:email', async (req, res)=>{
      const email = req.params.email
      const query = { email }
      const user = await usersCollection.findOne(query)
      res.send({isAdmin: user?.role === 'admin'})
    })

    // create an user
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    // get user data by id
    app.put('/users/admin/:id', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email
      const query = { email: decodedEmail }
      const user = await usersCollection.findOne(query)
      if (user.role !== 'admin') {
        return res.status(403).send({message: 'forbidden acccess'})
      }
      const id = req.params.id
      const filter = { _id: ObjectId(id) }
      const options = {upsert: true}
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc, options)
      res.send(result)
    })

    //get all doctors data
    app.get('/doctors', async (req, res) => {
      const query = {}
      const result = await doctorsCollection.find(query).toArray()
      res.send(result)
    })
    //post doctors data
    app.post('/doctors',  async (req, res) => {
      const doctor = req.body
      const result = await doctorsCollection.insertOne(doctor)
      res.send(result)
    })
    //delete doctors data
    app.delete('/doctors/:id',async (req, res) => {
      const id = req.params.id
      const filter = {_id: ObjectId(id)}
      const result = await doctorsCollection.deleteOne(filter)
      res.send(result)
    })



  } finally {
  }
}
run().catch(console.log());

app.get("/", async (req, res) => {
  res.send("Doctor portal server is running");
});
app.listen(port, () => console.log(`Doctor portal running on port: ${port}`));
