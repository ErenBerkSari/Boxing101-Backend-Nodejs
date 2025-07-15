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
app.use(
  cors({
    origin: "https://https://boxing101.netlify.app",
    credentials: true,
  })
);
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
