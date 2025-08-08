export interface AgendaItem {
    title: string;
    link: string;
    description: string;
    pubDate: string;
    author?: string;
    categories: string[];
    thumbnailUrl?: string;
    [key: string]: any;
}
export declare function useAgendaFeed(feedUrl: string): {
    items: AgendaItem[] | null;
    loading: boolean;
    error: Error | null;
};
