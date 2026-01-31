// Type definitions for the Runtime Consider 

export interface Entry {
    date: string;
    text: string;
    timestamp: string;
    committed: boolean;
}

export interface I18nStrings {
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
    slideToCommitText?: string;
    commitFailedText?: string;
    commitSuccessText?: string;
    slideToExitText?: string;
    exitAppText?: string;
    exitSuccessText?: string;
    commitModalTitle?: string;
    commitModalMessage?: string;
    cancelButtonText?: string;
    encouragementKeepGoing?: string;
    encouragementOnFire?: string;
    encouragementAlmostThere?: string;
    encouragementSoClose?: string;
    encouragementOneMorePush?: string;
    encouragementSuccess?: string;
    themeOptions?: Record<string, string>;
}

export interface AppConfig extends Record<string, unknown> {
    language?: string;
    theme?: string;
}
