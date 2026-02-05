// Hamburger menu and settings management

import type { AppConfig } from './types';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, THEME_OPTIONS } from './constants';
import { loadTranslations, translationStrings } from './i18n';
import { applyThemePreference, renderHistoryView } from './ui';
import { exitRuntimeConsider } from './public-side-to-commit';

const saveUserConfig = async (
    newLanguage?: string, 
    newTheme?: string
): Promise<void> => {
    try {
        const currentConfig = await window.electron.config.getConfig() as AppConfig | null;
        const updatedConfig: AppConfig = currentConfig || {};

        if (newLanguage) {
            updatedConfig.language = newLanguage;
        }

        if (newTheme) {
            updatedConfig.theme = newTheme;
        }

        await window.electron.config.saveConfig(updatedConfig);
    } catch (error) {
        console.error('Failed to save configuration', error);
    }
};

export const createHamburgerMenu = async (): Promise<void> => {
    const headerElement = document.querySelector('.header');

    if (!headerElement) {
        return;
    }

    const menuContainer = document.createElement('div');
    menuContainer.className = 'hamburger-menu-container';

    const hamburgerButton = document.createElement('button');
    hamburgerButton.className = 'hamburger-button';
    hamburgerButton.setAttribute('aria-label', 'Menu');
    hamburgerButton.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--theme-text-1-default)" stroke-width="2" stroke-linecap="butt" stroke-linejoin="butt">
            <line x1="3" y1="5" x2="21" y2="5"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="19" x2="21" y2="19"></line>
        </svg>
    `;

    const dropdownMenu = document.createElement('div');
    dropdownMenu.className = 'dropdown-menu';

    // Language selector
    const languageSelectorLabel = document.createElement('label');
    const languageSelectElement = document.createElement('select');
    languageSelectorLabel.className = 'menu-item-label';

    for (const languageCode of SUPPORTED_LANGUAGES) {
        const optionElement = document.createElement('option');
        optionElement.value = languageCode;
        optionElement.textContent = languageCode.toUpperCase();
        languageSelectElement.appendChild(optionElement);
    }

    const languageLabelText = document.createElement('span');
    languageLabelText.textContent = 'Language: ';
    languageSelectorLabel.appendChild(languageLabelText);
    languageSelectorLabel.appendChild(languageSelectElement);

    // Theme selector
    const themeSelectorLabel = document.createElement('label');
    const themeSelectElement = document.createElement('select');
    themeSelectorLabel.className = 'menu-item-label';

    for (const themeOption of THEME_OPTIONS) {
        const optionElement = document.createElement('option');
        optionElement.value = themeOption;
        optionElement.textContent = themeOption[0].toUpperCase() + themeOption.slice(1);
        themeSelectElement.appendChild(optionElement);
    }

    const themeLabelText = document.createElement('span');
    themeLabelText.textContent = 'Theme: ';
    themeSelectorLabel.appendChild(themeLabelText);
    themeSelectorLabel.appendChild(themeSelectElement);

    // Exit button
    const exitButton = document.createElement('button');
    exitButton.className = 'menu-exit-button';
    const exitButtonText = translationStrings?.exitAppText || 'EXIT';
    exitButton.textContent = exitButtonText;

    dropdownMenu.appendChild(languageSelectorLabel);
    dropdownMenu.appendChild(themeSelectorLabel);
    dropdownMenu.appendChild(exitButton);

    menuContainer.appendChild(hamburgerButton);
    menuContainer.appendChild(dropdownMenu);
    headerElement.appendChild(menuContainer);

    let isMenuOpen = false;

    const toggleMenu = (): void => {
        isMenuOpen = !isMenuOpen;
        
        if (isMenuOpen) {
            dropdownMenu.classList.add('show');
            hamburgerButton.classList.add('active');
        } else {
            dropdownMenu.classList.remove('show');
            hamburgerButton.classList.remove('active');
        }
    };

    hamburgerButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleMenu();
    });

    document.addEventListener('click', (event) => {
        const target = event.target as Node;
        if (isMenuOpen && !menuContainer.contains(target)) {
            isMenuOpen = false;
            dropdownMenu.classList.remove('show');
            hamburgerButton.classList.remove('active');
        }
    });

    // Load saved configuration
    try {
        const currentConfig = await window.electron.config.getConfig() as AppConfig | null;
        
        const savedLanguage = currentConfig?.language || DEFAULT_LANGUAGE;
        const savedTheme = currentConfig?.theme || 'system';

        languageSelectElement.value = SUPPORTED_LANGUAGES.includes(savedLanguage) 
            ? savedLanguage 
            : DEFAULT_LANGUAGE;

        themeSelectElement.value = THEME_OPTIONS.includes(savedTheme) 
            ? savedTheme 
            : 'system';

        await loadTranslations(languageSelectElement.value);
        applyThemePreference(themeSelectElement.value);

    } catch (error) {
        await loadTranslations(DEFAULT_LANGUAGE);
        applyThemePreference('system');
    }

    // Event listeners for changes
    languageSelectElement.addEventListener('change', async () => {
        const selectedLanguage = languageSelectElement.value;
        await loadTranslations(selectedLanguage);
        await saveUserConfig(selectedLanguage, undefined);
        
        renderHistoryView({ initialLimit: 12, batchSize: 20 });

        if (translationStrings.languageLabel) {
            languageLabelText.textContent = `${translationStrings.languageLabel}: `;
        }
    });

    themeSelectElement.addEventListener('change', async () => {
        const selectedTheme = themeSelectElement.value;
        applyThemePreference(selectedTheme);
        await saveUserConfig(undefined, selectedTheme);
    });

    // Exit button event listener
    exitButton.addEventListener('click', () => {
        exitRuntimeConsider(
            () => window.electron.app.exit(),
            { 
                initialHeight: 140 
            }
        );
    });

    // Apply translation labels
    if (translationStrings.languageLabel) {
        languageLabelText.textContent = `${translationStrings.languageLabel}: `;
    }

    if (translationStrings.themeLabel) {
        themeLabelText.textContent = `${translationStrings.themeLabel}: `;
    }
};
