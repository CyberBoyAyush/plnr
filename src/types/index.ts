export interface CodebaseContext {
  projectRoot: string;
  framework?: string;
  language: string;
  dependencies: string[];
  fileTree: string;
  relevantFiles: FileInfo[];
}

export interface FileInfo {
  path: string;
  content?: string;
  size: number;
}

export interface Plan {
  summary: string;
  steps: Step[];
  dependencies_to_add: string[];
  risks: string[];
  tokensUsed?: number;
}

export interface Step {
  title: string;
  description: string;
  files_to_modify: string[];
  files_to_create: string[];
  code_changes: string;
}

export interface Config {
  openRouterApiKey: string;
  exaApiKey: string;
  model: string;
  modelContextWindow: number;
  nodeEnv: string;
  debug: boolean;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
