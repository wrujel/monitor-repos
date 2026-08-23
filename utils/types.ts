export type ProjectEntry = {
  repo: string;
  title: string;
  repoUrl: string;
  url: string;
  archived: boolean;
  visibility: "public" | "private";
  service?: string;
};

export type Project = {
  repo: string;
  title: string;
  repoUrl: string;
  url: string;
};

export type RepoStatus = {
  repo: string;
  status: string;
  color?: string;
  badge?: RepoBadge;
};

/** One settled run — data/report.json is an array of these, oldest first. */
export type Report = {
  summary: Summary;
  repos: RepoStatus[];
};

export type RepoBadge = {
  schemaVersion: 1;
  label: string;
  message: string;
  color?: string;
  labelColor?: string;
  isError?: boolean;
  namedLogo?: string;
  logoSvg?: string;
  logoColor?: string;
  style?: string;
};

export type Summary = {
  repos_count: number;
  last_update: string;
  active: number;
  deploy_down: number;
  archive: number;
};
