export interface Profile {
    id: string;
    name: string;
    age: number;
    location: string;
    university?: string;
    company?: string;
    image: string;
    challengeTheme: string;
    skills: string[];
    isStudent: boolean;
}
