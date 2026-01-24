export const createCSP = (options?: {
    allowInlineScripts?: boolean;
    allowEval?: boolean;
    additionalSources?: string[];
}): string => {
    const directives = [
        "default-src 'self'",
        options?.allowInlineScripts 
            ? "script-src 'self' 'unsafe-inline'" 
            : "script-src 'self'",
        options?.allowEval 
            ? "script-src 'self' 'unsafe-eval'" 
            : "",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self' https:",
        ...(options?.additionalSources || []),
    ].filter(Boolean);
  
    return directives.join('; ');
};