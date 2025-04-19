import axios from "axios";

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json;api-version=3.0-preview.1",
};

// GET
export const get = (url: string, params: any) => {
  return axios.get(url, { headers, params });
};

// POST
export const post = (url: string, data: any, params?: any) => {
  return axios.post(url, data, { headers, params });
};

// PUT
export const put = (url: string, data: any) => {
  return axios.put(url, data, { headers });
};

// DELETE
export const del = (url: string) => {
  return axios.delete(url, { headers });
};
