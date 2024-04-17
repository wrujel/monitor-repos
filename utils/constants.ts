import dotenv from "dotenv";
dotenv.config();

export const PLACEHOLDER_SUMMARY = "%{{summary}}%";
export const PLACEHOLDER_TABLE = "%{{table}}%";
export const ROOT_PATH = process.env.ROOT_PATH;

export const headers = {
  headers: {
    "content-type": "application/json;charset=UTF-8",
    "user-agent": "node.js",
  },
};

export const PASSED_STATUS = "active";
