import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}

export interface QuestionJSON {
  id: number;
  question: string;
  answer: string;
}

export interface GradeResult {
  score: number;
  feedback: string;
}
