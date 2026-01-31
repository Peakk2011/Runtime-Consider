// Internationalization utilities

import type { I18nStrings } from './types';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './constants';

export let translationStrings: I18nStrings = {};

export const loadTranslations = async (languageCode: string): Promise<void> => {
    const selectedLanguage = SUPPORTED_LANGUAGES.includes(languageCode) 
        ? languageCode 
        : DEFAULT_LANGUAGE;

    try {
        const translationModule = await import(`../i18n/${selectedLanguage}.json`);
        translationStrings = translationModule?.default 
            ? translationModule.default 
            : translationModule;
        applyTranslations();
    } catch (error) {
        console.error('Failed to load translations', error);
    }
};

export const applyTranslations = (): void => {
    if (!translationStrings) {
        return;
    }

    const appTitleImage = document.querySelector('.app-title img') as HTMLImageElement | null;
    const todayTextInput = document.getElementById("todayInput") as HTMLTextAreaElement;
    const commitButton = document.getElementById("commitBtn") as HTMLButtonElement;
    const historyTitleElement = document.querySelector('.history-title') as HTMLDivElement | null;

    if (appTitleImage && translationStrings.appTitleImage) {
        appTitleImage.src = translationStrings.appTitleImage;
    }

    if (translationStrings.todayPlaceholder) {
        todayTextInput.placeholder = translationStrings.todayPlaceholder;
    }

    if (translationStrings.commitButtonText) {
        const buttonTextSpan = commitButton.querySelector('span');
        if (buttonTextSpan) {
            buttonTextSpan.textContent = translationStrings.commitButtonText;
        }
    }

    if (historyTitleElement && translationStrings.historyTitle) {
        historyTitleElement.textContent = translationStrings.historyTitle;
    }
};
