export interface Profile {
    id: string;
    name: string;
    age: number;
    location: string;
    university?: string;
    company?: string;
    image: string;
    challengeTheme: string;
    bio: string;
    skills: string[];
    seekingFor?: string[];
    seekingRoles?: string[];
    statusTags?: string[];
    isStudent: boolean;
    createdAt: string;
}
