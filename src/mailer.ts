// find all certificates that are about to expire in self notifyBefore time
import Certificate from "./schemas/Certificate";
import {
  Certificate as CertificateInterface,
  User as UserInterface,
} from "./types/Certificate";
import User from "./schemas/User";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
dotenv.config();
export const findToNotify = async () => {
    const users = await User.find();
    for (const user of users) {
      const certsToNotify: CertificateInterface[] = [];
      for (const certId of user.certificates) {
        const cert = await Certificate.findById(certId);
        if (cert) {
          if (
            user.globalNotification &&
            cert.timeRemaining < user.globalNotification
          ) {
            certsToNotify.push(cert);
          } else if (cert.timeRemaining < cert.notifyBefore) {
            certsToNotify.push(cert);
          }
        }
      }
      if (certsToNotify.length > 0) {
        notifyUsers(certsToNotify, user.email);
      }
    }
  };
  const transporter = nodemailer.createTransport({
    port: 465,
    host: "smtp.gmail.com",
    auth: {
      user: process.env.MAILER_EMAIL,
      pass: process.env.MAILER_PASSWORD,
    },
    secure: true,
  });
  export const notifyUsers = (certs: CertificateInterface[], email: string) => {
    const mailData = {
      from: process.env.MAILER_EMAIL, // sender address
      to: email,
      subject: `Your certificate is about to expire`, // Subject line
      html: `<div>
        <h1>Your certificate(s) with the following details are about to expire:</h1>
        <ul>
          ${certs.map(
            (cert) =>
              `<li>
              <h2>${cert.Subject}</h2>
              <p>Issuer: ${cert.Issuer}</p>
              <p>NotAfter: ${cert.NotAfter}</p>
              <p>Time Remaining: ${cert.timeRemaining} days</p>
            </li>`
          )}
        </ul>
      </div>`,
    };
    transporter.sendMail(mailData, function (err: any, _info: any) {
      if (err) console.log({ message: "Error", error: err });
      else console.log({ message: "Success" });
    });
  };