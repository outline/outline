const env = typeof window === "undefined" ? process.env : window.env;

// Add Bitbucket environment variables for client-side access
const clientEnv = {
  ...env,
  BITBUCKET_USERNAME: env.BITBUCKET_USERNAME,
  JIRA_URL: env.JIRA_URL,
  JIRA_EMAIL: env.JIRA_EMAIL,
};

export default clientEnv as Record<string, any>;
