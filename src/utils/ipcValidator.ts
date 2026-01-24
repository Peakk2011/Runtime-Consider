import { z } from 'zod';

/**
 * Validates IPC channel names
 */
export const validateIPCChannel = (channel: string): boolean => {
    const allowedChannels = /^[a-zA-Z0-9:_-]+$/;
    return allowedChannels.test(channel) && channel.length < 100;
};

/**
 * IPC handler
 */
export const createIPCHandler = <T extends z.ZodType>(
    channel: string,
    schema: T,
    handler: (data: z.infer<T>) => Promise<unknown> | unknown
) => {
    if (!validateIPCChannel(channel)) {
        throw new Error(`Invalid IPC channel: ${channel}`);
    }

    return async (event: Electron.IpcMainInvokeEvent, data: unknown) => {
        try {
            const validated = schema.parse(data);
            return await handler(validated);
        } catch (error) {
            throw new Error(`IPC validation failed: ${error}`);
        }
  };
};