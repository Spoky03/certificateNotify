import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Certificate" }],
  globalNotification : { type: Number }
});

export default mongoose.model("User", UserSchema);