import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER_URL,

  withCredentials: true,
  timeout: 15000, // Fail requests after 15 seconds instead of hanging infinitely
});

export default api;
