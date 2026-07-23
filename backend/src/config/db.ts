import mongoose from "mongoose";

export async function connectDB(uri: string): Promise<void> {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("error", (err) => console.error("MongoDB connection error", err));
  mongoose.connection.on("disconnected", () => console.warn("MongoDB disconnected; writes will queue until reconnect"));
  mongoose.connection.on("reconnected", () => console.log("MongoDB reconnected"));

  await mongoose.connect(uri);
  console.log("MongoDB connected");
}
