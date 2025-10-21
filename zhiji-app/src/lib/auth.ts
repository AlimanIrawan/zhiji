import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { storage } from '@/lib/storage';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          // 从存储获取用户信息
          const userKey = `auth:email:${credentials.email}`;
          const userData = await storage.hgetall(userKey);

          if (!userData || !userData.password) {
            return null;
          }

          // 验证密码
          const isValid = await bcrypt.compare(credentials.password, userData.password as string);
          if (!isValid) {
            return null;
          }

          // 获取用户详细信息
          const profileKey = `user:${userData.id}:profile`;
          const profile = await storage.hgetall(profileKey);

          return {
            id: userData.id as string,
            email: userData.email as string,
            name: profile?.name as string || userData.email as string,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      }
    }),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      })
    ] : []),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET ? [
      GitHubProvider({
        clientId: process.env.GITHUB_ID,
        clientSecret: process.env.GITHUB_SECRET,
      })
    ] : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'github') {
        try {
          const email = user.email!;
          const userKey = `auth:email:${email}`;
          const existingUser = await storage.hgetall(userKey);

          if (!existingUser || !existingUser.id) {
            // 创建新用户
            const userId = uuidv4();
            const now = new Date().toISOString();

            // 保存认证信息
            await storage.hset(userKey, {
              id: userId,
              email: email,
              provider: account.provider,
              createdAt: now,
            });

            // 创建用户资料
            const profileKey = `user:${userId}:profile`;
            await storage.hset(profileKey, {
              id: userId,
              email: email,
              name: user.name || email,
              height: 170,
              currentWeight: 70,
              targetWeight: 65,
              dailyCalorieGoal: 2000,
              activityLevel: 'moderate',
              createdAt: now,
              updatedAt: now,
            });

            user.id = userId;
          } else {
            user.id = existingUser.id as string;
          }
        } catch (error) {
          console.error('SignIn error:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    signUp: '/register',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};