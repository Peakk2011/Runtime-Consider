/* eslint-disable import/no-unresolved */
import config from '@config/window.json';

export interface WindowSize {
    width: number;
    height: number;
    min?: {
        width: number;
        height: number;
    };
    max?: {
        width?: number;
        height?: number;
    };
}

export interface WindowConfig {
    size: WindowSize;
    resizable?: boolean;
    fullscreen?: boolean;
    title?: string;
}

const size: WindowSize = {
    width: config.width,
    height: config.height,
    min: config.min
};

export const windowConfig: WindowConfig = {
    size: size,
    resizable: config.resizable,
    fullscreen: config.fullscreen,
    title: config.title
};