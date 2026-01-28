// import { logger } from "@utils/logger";

/**
 * Date range utilities for Runtime Consider
 * Handles date calculations, ranges, and gap detection
 */
export class DateUtils {
    /**
     * Get today's date as ISO string (YYYY-MM-DD)
     */
    static getToday(): string {
        return new Date().toISOString().split("T")[0];
    }

    /**
     * Parse ISO date string to Date object
     */
    static parseDate(dateStr: string): Date {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD`);
        }
        return new Date(dateStr + "T00:00:00Z");
    }

    /**
     * Format Date object as ISO string
     */
    static formatDate(date: Date): string {
        return date.toISOString().split("T")[0];
    }

    /**
     * Get date X days ago
     */
    static getDaysAgo(days: number): string {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return this.formatDate(date);
    }

    /**
     * Get date X days from now
     */
    static getDaysFromNow(days: number): string {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return this.formatDate(date);
    }

    /**
     * Get all dates between start and end (inclusive)
     */
    static getDateRange(startDate: string, endDate: string): string[] {
        const start = this.parseDate(startDate);
        const end = this.parseDate(endDate);
        const dates: string[] = [];

        const current = new Date(start);
        while (current <= end) {
            dates.push(this.formatDate(current));
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    /**
     * Find gaps (missing entries) in date range
     */
    static findMissingDates(dates: string[], startDate: string, endDate: string): string[] {
        const expectedDates = this.getDateRange(startDate, endDate);
        const providedSet = new Set(dates);
        return expectedDates.filter((date) => !providedSet.has(date));
    }

    /**
     * Get date N days before end date
     */
    static getDateBefore(date: string, daysBack: number): string {
        const d = this.parseDate(date);
        d.setDate(d.getDate() - daysBack);
        return this.formatDate(d);
    }

    /**
     * Get date N days after start date
     */
    static getDateAfter(date: string, daysForward: number): string {
        const d = this.parseDate(date);
        d.setDate(d.getDate() + daysForward);
        return this.formatDate(d);
    }

    /**
     * Calculate number of days between two dates
     */
    static daysBetween(date1: string, date2: string): number {
        const d1 = this.parseDate(date1);
        const d2 = this.parseDate(date2);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    /**
     * Check if date is today
     */
    static isToday(date: string): boolean {
        return date === this.getToday();
    }

    /**
     * Check if date is in future
     */
    static isFuture(date: string): boolean {
        return this.parseDate(date) > new Date();
    }

    /**
     * Check if date is in past
     */
    static isPast(date: string): boolean {
        return this.parseDate(date) < new Date();
    }

    /**
     * Get week start date (Monday)
     */
    static getWeekStart(date: string): string {
        const d = this.parseDate(date);
        const day = d.getUTCDay();
        const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setUTCDate(diff));
        return this.formatDate(weekStart);
    }

    /**
     * Get all dates in week
     */
    static getWeekDates(date: string): string[] {
        const weekStart = this.getWeekStart(date);
        return this.getDateRange(weekStart, this.getDateAfter(weekStart, 6));
    }

    /**
     * Get month for given date
     */
    static getMonthDates(date: string): string[] {
        const d = this.parseDate(date);
        const year = d.getUTCFullYear();
        const month = d.getUTCMonth();

        const start = new Date(Date.UTC(year, month, 1));
        const end = new Date(Date.UTC(year, month + 1, 0));

        return this.getDateRange(this.formatDate(start), this.formatDate(end));
    }

    /**
     * Format date for display (human readable)
     */
    static formatForDisplay(date: string): string {
        const d = this.parseDate(date);
        const today = this.getToday();

        if (date === today) {
            return "Today";
        }

        const yesterday = this.getDaysAgo(1);
        if (date === yesterday) {
            return "Yesterday";
        }

        const options: Intl.DateTimeFormatOptions = {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
        };

        return d.toLocaleDateString("en-US", options);
    }

    /**
     * Format time for display
     */
    static formatTimeForDisplay(isoTimestamp: string): string {
        const d = new Date(isoTimestamp);
        const options: Intl.DateTimeFormatOptions = {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        };
        return d.toLocaleTimeString("en-US", options);
    }
}

/**
 * Entry with metadata for display
 */
export interface DisplayEntry {
    date: string;
    dateFormatted: string;
    text: string;
    timestamp: string;
    timeFormatted: string;
    committed: boolean;
}

/**
 * Timeline entry - represents day with optional entry
 */
export interface TimelineDay {
    date: string;
    dateFormatted: string;
    hasEntry: boolean;
    entry?: DisplayEntry;
    isToday: boolean;
    isEmpty: boolean; // True if no entry exists
}

/**
 * Format entries for display
 */
export const formatEntryForDisplay = (entry: {
    date: string;
    text: string;
    timestamp: string;
    committed: boolean;
}): DisplayEntry => {
    return {
        ...entry,
        dateFormatted: DateUtils.formatForDisplay(entry.date),
        timeFormatted: DateUtils.formatTimeForDisplay(entry.timestamp),
    };
};

/**
 * Create timeline days from entries, including empty days
 */
export const createTimeline = (
    entryDates: string[],
    startDate: string,
    endDate: string
): TimelineDay[] => {
    const allDates = DateUtils.getDateRange(startDate, endDate);
    const entriesSet = new Set(entryDates);

    return allDates
        .reverse() // Newest first
        .map((date) => ({
            date,
            dateFormatted: DateUtils.formatForDisplay(date),
            hasEntry: entriesSet.has(date),
            isToday: DateUtils.isToday(date),
            isEmpty: !entriesSet.has(date),
        }));
};
