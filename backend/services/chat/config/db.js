import mongoose from "mongoose";
import dns from "dns";

const connectDB = async () => {
  try {
    const servers = dns.getServers();
    if (
      servers.length === 0 ||
      servers.some((s) => s === "127.0.0.1" || s === "127.0.0.1:53" || s === "::1")
    ) {
      dns.setServers(["1.1.1.1", "8.8.8.8"]);
      console.log("Using fallback DNS servers:", dns.getServers());
    }

    await mongoose.connect(process.env.MONGODB_URL, {
      serverSelectionTimeoutMS: 10000,
    });

    console.log("DB Connected");
  } catch (error) {
    console.log("Db Error", error);
  }
};

export default connectDB