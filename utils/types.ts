export type Project = {
  repo: string;
  title: string;
  repoUrl: string;
  url: string;
};

export type RepoStatus = {
  repo: string;
  status: string;
};

export type Summary = {
  repos_count: number;
  last_update: string;
  passed: number;
  failed: number;
};
