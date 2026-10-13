const SECRET_PATTERNS = [
  {
    type: "OpenAI API Key",
    regex: /sk-[a-zA-Z0-9_\-]{20,}/g,
  },
  {
    type: "AWS Access Key",
    regex: /AKIA[0-9A-Z]{16}/g,
  },
  {
    type: "Private Key",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    type: "JWT Token",
    regex: /eyJ[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]+/g,
  },
  {
    type: "Generic Password/Token Assignment",
    regex: /((?:password|secret|api_key|token|access_key)\s*[:=]\s*["'])([^"']{8,})(["'])/gi,
    replacement: "$1[REDACTED_SECRET]$3",
  },
];

const scanAndRedactSecrets = (text = "") => {
  if (typeof text !== "string" || !text) {
    return { cleanText: "", secretsFound: [] };
  }

  let cleanText = text;
  const secretsFound = [];

  for (const item of SECRET_PATTERNS) {
    const matches = cleanText.match(item.regex);
    if (matches && matches.length > 0) {
      secretsFound.push({
        type: item.type,
        count: matches.length,
      });

      if (item.replacement) {
        cleanText = cleanText.replace(item.regex, item.replacement);
      } else {
        cleanText = cleanText.replace(item.regex, "[REDACTED_SECRET]");
      }
    }
  }

  return {
    cleanText,
    secretsFound,
    hasSecrets: secretsFound.length > 0,
  };
};

module.exports = {
  scanAndRedactSecrets,
  SECRET_PATTERNS,
};
