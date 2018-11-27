module.exports = (config, user, token) => `
${config.appName}

This is your verification code to enter ${config.appName}.

${token}

If you do not know what this is, simply ignore it.
`;
