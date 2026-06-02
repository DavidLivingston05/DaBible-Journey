export interface Member {
  id?: string;
  ownerId?: string;
  name: string;
  age: number;
  chaptersRead: number;
  bookProgress: Record<string, number>; // bookId as string -> chapters completed
  updatedAt: string | Date;
  createdAt: string | Date;
  streak?: number;
  lastStreakDate?: string;
  lastActivityDate?: string;
  todayProgress?: number;
}

export interface Reflection {
  id?: string;
  text: string;
  authorName: string;
  authorId: string;
  memberId?: string;
  createdAt: any;
}

export type View = 'dashboard' | 'index' | 'admin' | 'member-detail' | 'community';

export interface TriviaQuestion {
  id: string;
  questionEn: string;
  questionTa: string;
  optionsEn: string[];
  optionsTa: string[];
  correctIndex: number;
  explanationEn: string;
  explanationTa: string;
  senderName: string;
  createdAt?: any;
}
