export interface Profile {
    id: string;
    name: string;
    age: number;
    location: string;
    university?: string;
    company?: string;
    image: string;
    challengeTheme: string;
    theme: string;
    bio: string;
    skills: string[];
    seekingFor?: string[];
    seekingRoles?: string[];
    statusTags?: string[];
    isStudent: boolean;
    createdAt: string;
}
