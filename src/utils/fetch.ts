/**
 * Fetches and parses a JSON file from a given URL.
 * The URL should be relative to the root of the application (where index.html is).
 * @param url - The path to the JSON file.
 * @returns A promise that resolves with the parsed JSON object.
 * @throws {Error} If the fetch request fails or the response is not ok.
 */
export const fetchJSON = async <T = unknown>(url: string): Promise<T> => {
    const response: Response = await fetch(url);
    if (!response.ok) {
        throw new Error(
            `Failed to fetch JSON from ${url}: ${response.status} ${response.statusText}`
        );
    }
    const data: T = await response.json();
    return data;
};

/**
 * Options for fetchWithTimeout function
 */
interface FetchWithTimeoutOptions extends RequestInit {
    timeout?: number;
}

/**
 * Fetch with timeout
 * @param url - The URL to fetch.
 * @param options - Fetch options including timeout.
 * @param timeout - Timeout in milliseconds (default: 10000).
 * @returns Fetch response.
 * @throws {Error} If the request times out or fails.
 */
export const fetchWithTimeout = async (
    url: string,
    options: RequestInit = {},
    timeout = 10000
): Promise<Response> => {
    const controller: AbortController = new AbortController();
    const id: ReturnType<typeof setTimeout> = setTimeout(
        () => controller.abort(),
        timeout
    );

    try {
        const response: Response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(id);
        return response;
    } catch (error: unknown) {
        clearTimeout(id);
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('An unknown error occurred during fetch');
    }
};

/**
 * Timeout in options object
 */
export const fetchWithTimeoutEnhanced = async (
    url: string,
    options: FetchWithTimeoutOptions = {}
): Promise<Response> => {
    const { timeout = 10000, ...fetchOptions } = options;
    const controller: AbortController = new AbortController();
    const id: ReturnType<typeof setTimeout> = setTimeout(
        () => controller.abort(),
        timeout
    );

    try {
        const response: Response = await fetch(url, {
            ...fetchOptions,
            signal: controller.signal
        });
        
        clearTimeout(id);
        return response;
    } catch (error: unknown) {
        clearTimeout(id);
        
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
        }
        
        if (error instanceof Error) {
            throw error;
        }
        
        throw new Error('An unknown error occurred during fetch');
    }
};