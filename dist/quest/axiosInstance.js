const axios = require("axios");
const { generateHeaders } = require("./genrateHeaders.js");

// Simple in-memory last reset timestamp & remaining count per bucket
const bucketMap = new Map();

const customAxiosWithProxy = (token, useProxy) => {
  const headers = generateHeaders(token);

  const config = {
    baseURL: "https://discord.com/api/v9/",
    headers,
    timeout: 30000,
  };

  if (useProxy) {
    const [host, portStr] = useProxy.ip.split(":");
    const [username, password] = useProxy.authentication.split(":");
    config.proxy = {
      protocol: "http",
      host,
      port: parseInt(portStr, 10),
      auth: {
        username,
        password,
      },
    };
  }

  const axiosInstance = axios.create(config);

  // Request interceptor: optionally delay if bucket says we must wait
  axiosInstance.interceptors.request.use(
    async (req) => {
      const bucketKey = `${req.method || "GET"}:${req.url}`;
      const info = bucketMap.get(bucketKey);

      if (info && info.remaining !== null && info.remaining <= 0 && info.resetAfter !== null) {
        await new Promise(resolve => setTimeout(resolve, info.resetAfter * 1000));
      }

      return req;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor: capture rate-limit headers & handle 429
  axiosInstance.interceptors.response.use(
    (response) => {
      const headers = response.headers;
      const bucketKey = `${response.config.method || "GET"}:${response.config.url}`;
      const remaining = headers["x-ratelimit-remaining"] !== undefined ?
        parseInt(headers["x-ratelimit-remaining"], 10) : null;
      const resetAfter = headers["x-ratelimit-reset-after"] !== undefined ?
        parseFloat(headers["x-ratelimit-reset-after"]) : null;
      const bucket = headers["x-ratelimit-bucket"];
      const global = headers["x-ratelimit-global"] === "true";

      bucketMap.set(bucketKey, { remaining, resetAfter, bucket, global });

      return response;
    },
    async (error) => {
      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers["retry-after"] !== undefined ?
          parseFloat(error.response.headers["retry-after"]) : null;

        if (retryAfter !== null) {
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return axiosInstance.request(error.config);
        }
      }
      return Promise.reject(error);
    }
  );

  return axiosInstance;
};

module.exports = { customAxiosWithProxy };
