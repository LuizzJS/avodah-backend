import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const database = await mongoose.connect(process.env.MONGO_URI);
    console.clear();
    console.log(
      `[DATABASE] Connected successfully: ${database.connections[0].name}`
    );
  } catch (error) {
    console.clear();
    console.error(`[DATABASE] Connection error: ${error.message}`);
    process.exit(1);
  }
};
