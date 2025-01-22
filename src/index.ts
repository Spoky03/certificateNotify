import express, { Request, Response, Application } from "express";
import dotenv from "dotenv";
import cron from "node-cron";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import Certificate from "./schemas/Certificate";
import User from "./schemas/User";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User as UserInterface } from "./types/Certificate";
import { findToNotify } from "./mailer";
import bcrypt from "bcryptjs";
declare global {
  namespace Express {
    interface Request {
      user?: string | JwtPayload;
    }
  }
}
dotenv.config();

const app: Application = express();
app.use(express.json());
app.use(bodyParser.json());
const SECRET_KEY = process.env.SECRET || "secret";
const TOKEN_EXPIRATION = Number(process.env.TOKEN_EXPIRATION) || 60 * 60 * 24; // 24 hours

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
// Middleware to verify JWT token
const verifyToken = (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).send("Authentication required.");
    return;
  }
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      res.status(403).send("Invalid token.");
      return;
    }
    req.user = decoded;
    next();
  });
};
app.get("/", (req: Request, res: Response) => {
  res.send("Welcome to Express & TypeScript Server");
});
app.get("/cert", verifyToken , (req: Request, res: Response) => {
  User.findById((req.user as JwtPayload)?.id).then((user) => {
    if (user) {
      Certificate.find({ _id: { $in: user.certificates } }).then((certs) => {
        res.json(certs);
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});
app.post("/cert", verifyToken, (req: Request, res: Response) => {
  const {
    Subject,
    Issuer,
    Thumbprint,
    NotBefore,
    NotAfter,
    timeRemaining,
    notifyBefore,
    remote
  } = req.body;
  if (remote && !Thumbprint) {
    const newCert = new Certificate({
      Subject,
      Issuer,
      NotBefore,
      NotAfter,
      timeRemaining,
      notifyBefore: 0,
      remote,
    });
    newCert.save().then((cert) => {
      User.findById((req.user as JwtPayload)?.id).then((user) => {
        if (user) {
          user.certificates.push(cert._id); // Push the ObjectId instead of the entire document
          user.save().then((user) => {
            res.json(user);
          });
        } else {
          res.status(404).json({ message: "User not found" });
        }
      });
      // set the id of the certificate to the thumbprint
      newCert.Thumbprint = String(newCert._id);
      newCert.save()
    });
    return;
  }
  //if thumbprint exists, update the notifyBefore
  Certificate.findOne({ Thumbprint }).then((cert) => {
    if (cert) {
      //if notifyBefore is 0, remove the certificate
      if (notifyBefore === 0) {
        cert.deleteOne().then(() => {
          res.json({ message: "Certificate removed" });
        });
        return;
      }
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
        remote: false,
      });
      newCert.save().then((cert) =>
        User.findById((req.user as JwtPayload)?.id).then((user) => {
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

app.put("/globalNotification", verifyToken, (req: Request, res: Response) => {
  const { days } = req.body;
  //Save to
  User.findById((req.user as JwtPayload)?.id).then((user) => {
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
app.get("/globalNotification", verifyToken, (req: Request, res: Response) => {
  User.findById((req.user as JwtPayload)?.id).then((user) => {
    if (user) {
      res.json(user.globalNotification);
    } else {
      res.status(404).json({ message: "User not found" });
    }
  });
});
app.post("/login", async (req: Request, res: Response): Promise<any> => {
  const { email, password } = req.body;
  const user = (await User.findOne({ email })) as unknown as UserInterface;
  if (!user || !user.email || !user.password) {
    return res.status(404).send("User not found");
  }

  const passwordIsValid = bcrypt.compareSync(password, user.password);

  if (!passwordIsValid) {
    return res.status(401).send("Invalid password");
  }

  const token = jwt.sign({ id: user._id }, SECRET_KEY, {
    expiresIn: TOKEN_EXPIRATION,
  });

  res.status(200).send({ auth: true, token, exp: Date.now() + 1000 * TOKEN_EXPIRATION });
});

app.post("/register", (req: Request, res: Response) => {
  const { email, password } = req.body;
  bcrypt.hash(password, 8, (err, hash) => {
    if (err) {
      return res.status(500).send("Error hashing password");
    }
    const newUser = new User({
      email,
      password: hash,
    });
    newUser.save().then((user) => {
      res.json(user);
    });
  });
});

app.use(unknownEndpoint);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is Fire at http://localhost:${PORT}`);
});

//cron.schedule("* * * * *", findToNotify);

// cron every day at 00:00
cron.schedule("0 0 * * *", findToNotify);