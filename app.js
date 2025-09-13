const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const authRoute = require("./routes/authRoute");
const movementRoute = require("./routes/movementRoute");
const programRoute = require("./routes/programRoute");
const userRoute = require("./routes/userRoute");

dotenv.config();

const app = express();
const allowedOrigins = [
  "https://boxing101.vercel.app",
  "https://boxing101.netlify.app",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy does not allow this origin"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

//Connect DB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("DB Connected Succesfuly");
  })
  .catch((err) => {
    console.log(err);
  });

app.use("/auth", authRoute);
app.use("/movement", movementRoute);
app.use("/program", programRoute);
app.use("/user", userRoute);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Sunucu ${port} portunda başlatıldı.`);
});
