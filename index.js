const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
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

async function run() {
  try {
    const appoinmentOptionCollection = client
      .db("doctorPortal")
      .collection("appointmentOptions");
    const bookingCollection = client.db("doctorPortal").collection("booking");




    //use aggregate query multiple collection and then merg date
    app.get("/appointmentOptions", async (req, res) => {
      const date = req.query.date;
      const query = {};
      const options = await appoinmentOptionCollection.find(query).toArray();
      //get the bookings of the provided date
      const bookingQuery = { appoinment: date }
      const alreadyBooked = await bookingCollection.find(bookingQuery).toArray()
      //code carefully :xD
      options.forEach(option => {
        const optionBooked = alreadyBooked.filter((book) => book.treatment === option.name)
        const bookedSlots = optionBooked.map((book) => book.slot);
        const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
        option.slots = remainingSlots
      })
      res.send(options);
    });






    // app.post("/booking", async (req, res) => {
    //   const booking = req.body;
    //   console.log(booking);
    //   const result = await bookingCollection.insertOne(booking);
    //   res.send(result);
    // });



    app.post("/booking", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const query = {
        appoinment: booking.appoinment,
        email:booking.email,
        treatment:booking.treatment
      }

      const alreadybooked = await bookingCollection.find(query).toArray()
      if (alreadybooked.length) {
        const message = `You already have a booking on `
        return res.send({ acknowledged: false, message });
      }
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // //get booking data
    // app.get('/booking', async (req, res) => {
    //    const query = {};
    //    const booking = await bookingCollection.find(query).toArray();
    //   res.send(booking);
    //   })
  } finally {
  }
}
run().catch(console.log());

app.get("/", async (req, res) => {
  res.send("Doctor portal server is running");
});
app.listen(port, () => console.log(`Doctor portal running on port: ${port}`));
