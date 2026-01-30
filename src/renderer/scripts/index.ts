interface Entry {
    date: string;
    text: string;
    timestamp: string;
    committed: boolean;
}


interface I18nStrings {
    appTitleImage?: string;
    todayPlaceholder?: string;
    commitButtonText?: string;
    historyTitle?: string;
    committedNoticePrefix?: string;
    todaySuffix?: string;
    noPreviousEntriesText?: string;
    immutableBadge?: string;
    commitWarning?: string;
    languageLabel?: string;
    themeLabel?: string;
}


interface AppConfig extends Record<string, unknown> {
    language?: string;
    theme?: string;
}


let translationStrings: I18nStrings = {};

const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'th', 'es', 'ja', 'fr'];

const todayDateString: string = new Date().toISOString().split("T")[0];
let isTodayCommitted = false;
let allEntries: Entry[] = [];


const todayDateLabel = document.getElementById("todayLabel") as HTMLDivElement;
const todayTextInput = document.getElementById("todayInput") as HTMLTextAreaElement;
const commitButton = document.getElementById("commitBtn") as HTMLButtonElement;
const committedStatusNotice = document.getElementById("committedNotice") as HTMLDivElement;
const historyEntriesContainer = document.getElementById("historyContainer") as HTMLDivElement;

const appTitleImage = document.querySelector('.app-title img') as HTMLImageElement | null;
const historyTitleElement = document.querySelector('.history-title') as HTMLDivElement | null;


const applyTranslations = (): void => {
    if (!translationStrings) {
        return;
    }

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


const loadTranslations = async (languageCode: string): Promise<void> => {
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


todayDateLabel.textContent = todayDateString;


const loadAllEntries = async (): Promise<void> => {
    try {
        const entryFileNames = await window.electron.storage.getAllEntries();
        const entryDates = entryFileNames.map((fileName) => fileName.replace(".json", ""));

        const loadedEntryPromises = entryDates.map(async (dateString) => {
            try {
                const entryData = await window.electron.storage.getEntry(dateString);
                return entryData ? (entryData as Entry) : null;
            } catch {
                return null;
            }
        });

        const loadedEntries = await Promise.all(loadedEntryPromises);

        allEntries = loadedEntries
            .filter((entry): entry is Entry => entry !== null)
            .sort((entryA, entryB) => {
                return new Date(entryB.date).getTime() - new Date(entryA.date).getTime();
            });

        const todayEntry = allEntries.find((entry) => entry.date === todayDateString);

        if (todayEntry) {
            todayTextInput.value = todayEntry.text;
            todayTextInput.disabled = true;
            todayTextInput.readOnly = true;
            todayTextInput.style.cursor = 'not-allowed';
            todayTextInput.style.opacity = '0.6';
            
            commitButton.disabled = true;
            commitButton.style.display = "none";
            
            isTodayCommitted = true;
            committedStatusNotice.style.display = "block";

            const committedPrefix = translationStrings?.committedNoticePrefix || 'Committed at';
            const committedTime = new Date(todayEntry.timestamp).toLocaleTimeString();
            committedStatusNotice.textContent = `${committedPrefix} ${committedTime}`;
        } else {
            todayTextInput.focus();
        }

        renderHistoryView();

    } catch (error) {
        console.error("Failed to load entries:", error);
        todayTextInput.focus();
    }
};


const autoExpandTextarea = (textareaElement: HTMLTextAreaElement): void => {
    textareaElement.style.height = "auto";
    const newHeight = Math.min(textareaElement.scrollHeight, 400);
    textareaElement.style.height = `${newHeight}px`;
};


const handleCommitEntry = async (): Promise<void> => {
    const trimmedText = todayTextInput.value.trim();

    if (!trimmedText || isTodayCommitted) {
        return;
    }

    const warningMessage = translationStrings?.commitWarning || 
        'WARNING: This action is PERMANENT and IRREVERSIBLE.\n\n' +
        'Once committed, this entry cannot be edited, modified, or deleted.\n' +
        'The text will be locked forever.\n\n' +
        'Are you absolutely sure you want to commit?';
    
    const userConfirmed = confirm(warningMessage);
    
    if (!userConfirmed) {
        return;
    }

    const newEntry: Entry = {
        date: todayDateString,
        text: trimmedText,
        timestamp: new Date().toISOString(),
        committed: true,
    };

    try {
        await window.electron.storage.saveEntry(todayDateString, newEntry.text);

        todayTextInput.disabled = true;
        todayTextInput.readOnly = true;
        todayTextInput.style.cursor = 'not-allowed';
        todayTextInput.style.opacity = '0.6';
        
        commitButton.disabled = true;
        commitButton.style.display = "none";
        
        isTodayCommitted = true;
        committedStatusNotice.style.display = "block";

        const committedPrefix = translationStrings?.committedNoticePrefix || 'Committed at';
        const committedTime = new Date(newEntry.timestamp).toLocaleTimeString();
        committedStatusNotice.textContent = `${committedPrefix} ${committedTime}`;

        allEntries.unshift(newEntry);
        allEntries.sort((entryA, entryB) => {
            return new Date(entryB.date).getTime() - new Date(entryA.date).getTime();
        });

        renderHistoryView();

        todayTextInput.removeEventListener('input', handleTextareaInput);
        todayTextInput.removeEventListener('keydown', handleTextareaKeydown);

    } catch (error) {
        console.error("Failed to commit entry:", error);
        alert("Failed to commit. Please try again.");
    }
};


const renderHistoryView = (): void => {
    const previousEntries = allEntries.filter(entry => entry.date !== todayDateString);

    let historyHTML = "";

    const todayEntry = allEntries.find(entry => entry.date === todayDateString);

    if (todayEntry) {
        const todaySuffix = translationStrings?.todaySuffix 
            ? ` ${translationStrings.todaySuffix}` 
            : ' (today)';

        const committedPrefix = translationStrings?.committedNoticePrefix || 'Committed';
        const committedTimestamp = new Date(todayEntry.timestamp).toLocaleString();

        historyHTML += `
            <div class="history-entry today committed-entry">
                <div class="history-date">${todayEntry.date}${todaySuffix}</div>
                <div class="history-text">${escapeHtmlContent(todayEntry.text)}</div>
                <div class="history-timestamp">${committedPrefix} ${committedTimestamp}</div>
            </div>
        `;
    }

    if (previousEntries.length === 0) {
        const emptyMessage = translationStrings?.noPreviousEntriesText || 'no previous entries';
        historyHTML += `<div class="history-empty">${emptyMessage}</div>`;
    } else {
        const committedPrefix = translationStrings?.committedNoticePrefix || 'Committed';
        const immutableBadgeText = translationStrings?.immutableBadge || '';

        const previousEntriesHTML = previousEntries.map(entry => {
            const entryTimestamp = new Date(entry.timestamp).toLocaleString();

            return `
                <div class="history-entry committed-entry">
                    <div class="history-date">${entry.date}</div>
                    <div class="history-text">${escapeHtmlContent(entry.text)}</div>
                    <div class="history-timestamp">${committedPrefix} ${entryTimestamp}</div>
                    <div class="immutable-badge">${immutableBadgeText}</div>
                </div>
            `;
        }).join('');

        historyHTML += previousEntriesHTML;
    }

    historyEntriesContainer.innerHTML = historyHTML;

    const allHistoryEntries = historyEntriesContainer.querySelectorAll('.history-entry');

    allHistoryEntries.forEach((entryElement) => {
        entryElement.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            return false;
        });

        entryElement.addEventListener('dblclick', (event) => {
            event.preventDefault();
            return false;
        });
    });
};


const escapeHtmlContent = (textContent: string): string => {
    const temporaryDiv = document.createElement("div");
    temporaryDiv.textContent = textContent;
    return temporaryDiv.innerHTML;
};


const handleTextareaInput = (): void => {
    if (!isTodayCommitted) {
        autoExpandTextarea(todayTextInput);
    }
};


const handleTextareaKeydown = (event: KeyboardEvent): void => {
    const isCommitShortcut = (event.metaKey || event.ctrlKey) && event.key === "Enter";

    if (isCommitShortcut) {
        handleCommitEntry();
    }
};


commitButton.addEventListener("click", handleCommitEntry);
todayTextInput.addEventListener("keydown", handleTextareaKeydown);
todayTextInput.addEventListener("input", handleTextareaInput);


loadAllEntries();


const applyThemePreference = (themePreference: string | undefined): void => {
    if (!themePreference || themePreference === 'system') {
        document.documentElement.removeAttribute('data-theme');
    } else if (themePreference === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    } else if (themePreference === 'dark') {
        document.documentElement.removeAttribute('data-theme');
    }
};


const createHamburgerMenu = async (): Promise<void> => {
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
    dropdownMenu.style.display = 'none';

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

    const themeSelectorLabel = document.createElement('label');
    const themeSelectElement = document.createElement('select');
    themeSelectorLabel.className = 'menu-item-label';

    const themeOptions = ['system', 'light', 'dark'];

    for (const themeOption of themeOptions) {
        const optionElement = document.createElement('option');
        optionElement.value = themeOption;
        optionElement.textContent = themeOption[0].toUpperCase() + themeOption.slice(1);
        themeSelectElement.appendChild(optionElement);
    }

    const themeLabelText = document.createElement('span');
    themeLabelText.textContent = 'Theme: ';
    themeSelectorLabel.appendChild(themeLabelText);
    themeSelectorLabel.appendChild(themeSelectElement);

    dropdownMenu.appendChild(languageSelectorLabel);
    dropdownMenu.appendChild(themeSelectorLabel);

    menuContainer.appendChild(hamburgerButton);
    menuContainer.appendChild(dropdownMenu);
    headerElement.appendChild(menuContainer);

    let isMenuOpen = false;

    const toggleMenu = (): void => {
        isMenuOpen = !isMenuOpen;
        dropdownMenu.style.display = isMenuOpen ? 'block' : 'none';
    };

    hamburgerButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleMenu();
    });

    document.addEventListener('click', (event) => {
        const target = event.target as Node;
        if (isMenuOpen && !menuContainer.contains(target)) {
            isMenuOpen = false;
            dropdownMenu.style.display = 'none';
        }
    });

    try {
        const currentConfig = await window.electron.config.getConfig() as AppConfig | null;
        
        const savedLanguage = currentConfig?.language || DEFAULT_LANGUAGE;
        const savedTheme = currentConfig?.theme || 'system';

        languageSelectElement.value = SUPPORTED_LANGUAGES.includes(savedLanguage) 
            ? savedLanguage 
            : DEFAULT_LANGUAGE;

        themeSelectElement.value = themeOptions.includes(savedTheme) 
            ? savedTheme 
            : 'system';

        await loadTranslations(languageSelectElement.value);
        applyThemePreference(themeSelectElement.value);

    } catch (error) {
        await loadTranslations(DEFAULT_LANGUAGE);
        applyThemePreference('system');
    }

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

    languageSelectElement.addEventListener('change', async () => {
        const selectedLanguage = languageSelectElement.value;
        await loadTranslations(selectedLanguage);
        await saveUserConfig(selectedLanguage, undefined);
        renderHistoryView();

        if (translationStrings.languageLabel) {
            languageLabelText.textContent = `${translationStrings.languageLabel}: `;
        }
    });

    themeSelectElement.addEventListener('change', async () => {
        const selectedTheme = themeSelectElement.value;
        applyThemePreference(selectedTheme);
        await saveUserConfig(undefined, selectedTheme);
    });

    if (translationStrings.languageLabel) {
        languageLabelText.textContent = `${translationStrings.languageLabel}: `;
    }

    if (translationStrings.themeLabel) {
        themeLabelText.textContent = `${translationStrings.themeLabel}: `;
    }
};


if (process.env.NODE_ENV === 'production') {
    document.addEventListener('keydown', (event) => {
        const isDevToolsShortcut = 
            event.key === 'F12' ||
            (event.ctrlKey && event.shiftKey && ['I', 'J', 'C'].includes(event.key.toUpperCase()));

        if (isDevToolsShortcut) {
            event.preventDefault();
            return false;
        }
    });
}


createHamburgerMenu().catch((error) => {
    console.error('Failed to create hamburger menu', error);
});