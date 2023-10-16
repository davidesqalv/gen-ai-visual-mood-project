/** @type {import('next').NextConfig} */
const dev = process.env.NODE_ENV === "development";
const nextConfig = {
  env: {
    API_URL: dev ? "http://127.0.0.1:8000" : "https://some.url",
  },
};

module.exports = nextConfig;
