import axios from "axios";

const baseHeaders = {
  "Content-Type": "application/json",
  Accept: "application/json",
};

// GET
export const get = (url: string, params: any) => {
  return axios.get(url, { headers: baseHeaders, params });
};

// POST — caller can pass extra headers (e.g. VSCode marketplace requires api-version)
export const post = (url: string, payload?: any, extraHeaders?: Record<string, string>) => {
  return axios.post(url, payload, { headers: { ...baseHeaders, ...extraHeaders } });
};

// PUT
export const put = (url: string, data: any) => {
  return axios.put(url, data, { headers: baseHeaders });
};

// DELETE
export const del = (url: string) => {
  return axios.delete(url, { headers: baseHeaders });
};
