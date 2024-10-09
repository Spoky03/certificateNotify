import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  certificates: [{ type: mongoose.Schema.Types.ObjectId, ref: "Certificate" }],
});

export default mongoose.model("User", UserSchema);