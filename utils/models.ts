import { IRepository } from "./types";
import { Schema, model } from "mongoose";

export const RepoModel = model<IRepository>(
  "Repo",
  new Schema<IRepository>({
    node_id: String,
    name: String,
    full_name: String,
    private: Boolean,
    html_url: String,
    description: String,
    fork: Boolean,
    url: String,
    forks_url: String,
    created_at: String,
    updated_at: String,
    pushed_at: String,
    git_url: String,
    ssh_url: String,
    clone_url: String,
    svn_url: String,
    homepage: String,
    size: Number,
    stargazers_count: Number,
    watchers_count: Number,
    language: String,
    has_issues: Boolean,
    has_projects: Boolean,
    has_downloads: Boolean,
    has_wiki: Boolean,
    has_pages: Boolean,
    has_discussions: Boolean,
    forks_count: Number,
    mirror_url: String,
    archived: Boolean,
    disabled: Boolean,
    open_issues_count: Number,
    allow_forking: Boolean,
    is_template: Boolean,
    web_commit_signoff_required: Boolean,
    topics: [String],
    visibility: String,
    forks: Number,
    open_issues: Number,
    watchers: Number,
    default_branch: String,
  })
);

export class Repository implements IRepository {
  public node_id: string = "";
  public name: string = "";
  public full_name: string = "";
  public private: boolean = false;
  public html_url: string = "";
  public description: string = "";
  public fork: boolean = false;
  public url: string = "";
  public forks_url: string = "";
  public created_at: string = "";
  public updated_at: string = "";
  public pushed_at: string = "";
  public git_url: string = "";
  public ssh_url: string = "";
  public clone_url: string = "";
  public svn_url: string = "";
  public homepage: string = "";
  public size: number = 0;
  public stargazers_count: number = 0;
  public watchers_count: number = 0;
  public language: string = "";
  public has_issues: boolean = false;
  public has_projects: boolean = false;
  public has_downloads: boolean = false;
  public has_wiki: boolean = false;
  public has_pages: boolean = false;
  public has_discussions: boolean = false;
  public forks_count: number = 0;
  public mirror_url: string | null = null;
  public archived: boolean = false;
  public disabled: boolean = false;
  public open_issues_count: number = 0;
  public allow_forking: boolean = false;
  public is_template: boolean = false;
  public web_commit_signoff_required: boolean = false;
  public topics: string[] = [];
  public visibility: string = "";
  public forks: number = 0;
  public open_issues: number = 0;
  public watchers: number = 0;
  public default_branch: string = "";
}
