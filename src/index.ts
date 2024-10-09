import express, { Express, Request, Response, Application } from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import mongoose from "mongoose";
import Certificate from "./schemas/Certificate";
import User from "./schemas/User";
//For env File
dotenv.config();

const app: Application = express();
const uri = process.env.DATABASE_URL || "mongodb://localhost:27017/test";
app.use(express.json());
mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

const testFunc = () => {
  console.log("Running a task every minute");
};
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Express & TypeScript Server");
});
app.post("/cert", (req: Request, res: Response) => {
  console.log(req.body);
  const {
    Subject,
    Issuer,
    Thumbprint,
    NotBefore,
    NotAfter,
    timeRemaining,
    notifyBefore,
    email,
  } = req.body;
  //make new cert and append to user
  const newCert = new Certificate({
    Subject,
    Issuer,
    Thumbprint,
    NotBefore,
    NotAfter,
    timeRemaining,
    notifyBefore,
  });
  newCert.save().then((cert) => {
    User.findOne({ email }).then((user) => {
      if (user) {
        user.certificates.push(cert._id); // Push the ObjectId instead of the entire document
        user.save().then((user) => {
          res.json(user);
        });
      } else {
        res.status(404).json({ message: "User not found" });
      }
    });
  });
});
app.post("/register", (req: Request, res: Response) => {
  console.log(req.body);
  const { name, email, password } = req.body;
  //Save to
  const newUser = new User({
    name,
    email,
    password,
  });
  newUser.save().then((user) => {
    res.json(user);
  });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is Fire at http://localhost:${PORT}`);
});

cron.schedule("* * * * *", testFunc);
