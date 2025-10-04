// Enhanced error handling for Composio and OpenAI APIs

export const handleComposioError = (error, context = "unknown") => {
  // Only log full error details in debug mode
  if (process.env.COMPOSIO_LOGGING_LEVEL === "debug") {
    console.error(`Composio error in ${context}:`, error);
  }

  // Check for specific error types
  if (error.errCode === "BACKEND::NOT_FOUND") {
    console.log("Composio action not found - using mock data fallback");
    return {
      type: "action_not_found",
      message: "Composio action not available - using mock data fallback",
      fallback: true,
    };
  }

  if (error.statusCode === 401) {
    console.log("Composio authentication failed - check API key");
    return {
      type: "auth_failed",
      message: "Composio authentication failed - using mock data fallback",
      fallback: true,
    };
  }

  if (error.statusCode === 403) {
    console.log("Composio access forbidden - check API permissions");
    return {
      type: "access_forbidden",
      message: "Composio access forbidden - using mock data fallback",
      fallback: true,
    };
  }

  // Generic error
  return {
    type: "generic_error",
    message: "Composio API error - using mock data fallback",
    fallback: true,
  };
};

export const handleOpenAIError = (error, context = "unknown") => {
  // Only log full error details in debug mode
  if (process.env.OPENAI_LOGGING_LEVEL === "debug") {
    console.error(`OpenAI error in ${context}:`, error);
  }

  if (error.status === 429) {
    if (error.code === "insufficient_quota") {
      console.log("OpenAI quota exceeded - using mock summary fallback");
      return {
        type: "quota_exceeded",
        message: "OpenAI quota exceeded - using realistic mock summary",
        fallback: true,
      };
    }

    if (error.code === "rate_limit_exceeded") {
      console.log("OpenAI rate limit exceeded - using mock summary fallback");
      return {
        type: "rate_limit_exceeded",
        message: "OpenAI rate limit exceeded - using realistic mock summary",
        fallback: true,
      };
    }
  }

  if (error.status === 401) {
    console.log("OpenAI authentication failed - check API key");
    return {
      type: "auth_failed",
      message: "OpenAI authentication failed - using mock summary fallback",
      fallback: true,
    };
  }

  // Generic error
  return {
    type: "generic_error",
    message: "OpenAI API error - using mock summary fallback",
    fallback: true,
  };
};

export const logErrorWithContext = (error, context, userId = "unknown") => {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    context,
    userId,
    error: {
      message: error.message,
      code: error.code,
      status: error.status,
      errCode: error.errCode,
    },
  };

  console.log(`Error logged: ${context} for user ${userId}`);
  return errorInfo;
};
