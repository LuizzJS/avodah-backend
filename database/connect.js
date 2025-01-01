import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const database = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.clear();
    console.log(
      `[DATABASE] Connected successfully to ${database.connection.host}, DB: ${database.connection.name}`
    );
  } catch (error) {
    console.clear();
    console.error("[DATABASE] Connection failed:");
    console.error(`Error Message: ${error.message}`);
    process.exit(1);
  }
};
