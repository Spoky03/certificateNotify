import express, { Request, Response, Application } from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import Certificate from "./schemas/Certificate";
import User from "./schemas/User";
import { findToNotify } from "./mailer";

dotenv.config();

const app: Application = express();
app.use(express.json());
app.use(bodyParser.json());
mongoose
  .connect(process.env.DATABASE_URL || "")
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });

const unknownEndpoint = (_req: Request, res: Response) => {
  res.status(404).send({ error: "unknown endpoint" });
};

app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Express & TypeScript Server");
});
app.get("/cert", (req: Request, res: Response) => {
  User.findOne({ email: req.query.email }).then((user) => {
    if (user) {
      Certificate.find({ _id: { $in: user.certificates } }).then((certs) => {
        res.json(certs);
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});
app.post("/cert", (req: Request, res: Response) => {
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
  //if thumbprint exists, update the notifyBefore
  Certificate.findOne({ Thumbprint }).then((cert) => {
    if (cert) {
      cert.notifyBefore = notifyBefore;
      cert.save().then((cert) => {
        res.json(cert);
      });
    } else {
      const newCert = new Certificate({
        Subject,
        Issuer,
        Thumbprint,
        NotBefore,
        NotAfter,
        timeRemaining,
        notifyBefore,
      });
      newCert.save().then((cert) =>
        User.findOne({ email }).then((user) => {
          if (user) {
            user.certificates.push(cert._id); // Push the ObjectId instead of the entire document
            user.save().then((user) => {
              res.json(user);
            });
          } else {
            res.status(404).json({ message: "User not found" });
          }
        })
      );
    }
  });
});
app.post("/register", (req: Request, res: Response) => {
  const { email, password } = req.body;
  //Save to
  const newUser = new User({
    email,
    password,
  });
  newUser.save().then((user) => {
    res.json(user);
  });
});
app.put("/globalNotification", (req: Request, res: Response) => {
  console.log(req.body);
  const { days, email } = req.body;
  //Save to
  User.findOne({ email }).then((user) => {
    if (user) {
      user.globalNotification = days;
      user.save().then((user) => {
        res.json(user);
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});

app.use(unknownEndpoint);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is Fire at http://localhost:${PORT}`);
});

// cron.schedule("* * * * *", findToNotify);
