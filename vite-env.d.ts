/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
    OPENAI_API_KEY?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
