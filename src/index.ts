import express, { Express, Request, Response, Application } from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import bodyParser from "body-parser"; 
import nodemailer from "nodemailer";
import mongoose from "mongoose";
import Certificate from "./schemas/Certificate";
import { Certificate as CertificateInterface } from "./types/Certificate";
import User from "./schemas/User";
//For env File
dotenv.config();

const app: Application = express();
const uri = process.env.DATABASE_URL || "mongodb://localhost:27017/test";
app.use(express.json());
app.use(bodyParser.json());
mongoose
  .connect(uri)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log(err);
  });
const transporter = nodemailer.createTransport({
  port: 465,
  host: "smtp.gmail.com",
  auth: {
    user: process.env.MAILER_EMAIL,
    pass: process.env.MAILER_PASSWORD,
  },
  secure: true,
});
const unknownEndpoint = (_req: Request, res: Response) => {
  res.status(404).send({ error: "unknown endpoint" });
};
// find all certificates that are about to expire in self notifyBefore time
const findToNotify = () => {
  Certificate.find().then((certs) => {
    const certsToNotify = certs.filter(
      (cert) => cert.timeRemaining <= cert.notifyBefore
    );
    console.log(certsToNotify);
    // Notify users
    notifyUsers(certsToNotify);
  });
};
const notifyUsers = (certs: CertificateInterface[]) => {
  console.log("Running a task every minute");
  certs.forEach((cert) => {
    User.find({ certificates: cert._id }).then((users) => {
      users.forEach((user) => {
        console.log(user.email);
        // send email
      });
    });
  });
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
app.post("/email", (req: Request, res: Response) => {
  const mailData = {
    from: process.env.MAILER_EMAIL, // sender address
    to: "stefangrzelec@gmail.com",
    subject: `Your certificate is about to expire`, // Subject line
    text: 'text',
  };
  transporter.sendMail(mailData, function (err: any, _info: any) {
    if (err) res.send({ message: "Error", error: err });
    else res.send({ message: "Success" });
  });
});
app.use(unknownEndpoint);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is Fire at http://localhost:${PORT}`);
});

cron.schedule("* * * * *", findToNotify);
