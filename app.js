const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Sunucu ${port} portunda başlatıldı.`);
});
