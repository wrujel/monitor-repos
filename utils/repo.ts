import { Schema, model } from "mongoose";

const RepoSchema = new Schema({
  name: String,
  url: String,
  description: String,
  language: String,
  stars: Number,
  forks: Number,
  createdAt: Date,
  updatedAt: Date,
});

export const RepoModel = model("Repo", RepoSchema);
